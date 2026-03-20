import test, { describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import request from "supertest";
import { CreateDiagramUseCase } from "../../application/use-cases/diagrams/create-diagram";
import { GetDiagramUseCase } from "../../application/use-cases/diagrams/get-diagram";
import { ListDiagramsUseCase } from "../../application/use-cases/diagrams/list-diagrams";
import { UpdateDiagramUseCase } from "../../application/use-cases/diagrams/update-diagram";
import { DeleteDiagramUseCase } from "../../application/use-cases/diagrams/delete-diagram";
import { ValidateApiKeyUseCase } from "../../application/use-cases/api-keys/validate-api-key";
import { requireSdkHeader } from "../../infrastructure/http/public-api/middleware/require-sdk-header";
import { createRequireApiKey } from "../../infrastructure/http/public-api/middleware/require-api-key";
import { createLogApiRequest } from "../../infrastructure/http/public-api/middleware/log-api-request";
import { createV1DiagramRoutes } from "../../infrastructure/http/public-api/v1-diagram.routes";
import { createV1HealthRoutes } from "../../infrastructure/http/public-api/v1-health.routes";
import { InMemoryDiagramRepository } from "../fakes/in-memory-diagram-repository";
import { InMemoryApiKeyRepository } from "../fakes/in-memory-api-key-repository";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";

const FRONTEND_URL = "http://localhost:5173";
const WORKSPACE_ID = crypto.randomUUID();
const OTHER_WORKSPACE_ID = crypto.randomUUID();

let diagrams: InMemoryDiagramRepository;
let apiKeys: InMemoryApiKeyRepository;
let users: InMemoryUserRepository;
let rawKey: string;
let userId: string;

function createApp() {
  diagrams = new InMemoryDiagramRepository();
  apiKeys = new InMemoryApiKeyRepository();
  users = new InMemoryUserRepository();

  // Create a test user
  userId = crypto.randomUUID();
  users.store.push({
    id: userId,
    email: "api@example.com",
    name: "API User",
    passwordHash: "hashed",
    role: "user",
    disabled: false,
    googleId: null,
    avatarUrl: null,
    createdAt: new Date(),
  });

  // Create an API key for that user
  rawKey = "dhk_" + crypto.randomBytes(32).toString("base64url");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  apiKeys.store.push({
    id: crypto.randomUUID(),
    userId,
    workspaceId: WORKSPACE_ID,
    name: "Test Key",
    keyPrefix: rawKey.slice(0, 10),
    keyHash,
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date(),
  });

  const validateApiKey = new ValidateApiKeyUseCase(apiKeys, users);
  const requireApiKey = createRequireApiKey(validateApiKey);
  const logApiRequest = createLogApiRequest(apiKeys);

  const app = express();
  app.use(express.json());

  // Health — no auth
  app.use("/v1/health", createV1HealthRoutes());

  // Middleware chain for /v1/
  app.use("/v1", requireSdkHeader, requireApiKey, logApiRequest);

  // Diagram routes
  app.use("/v1/diagrams", createV1DiagramRoutes({
    create: new CreateDiagramUseCase(diagrams),
    get: new GetDiagramUseCase(diagrams),
    list: new ListDiagramsUseCase(diagrams),
    update: new UpdateDiagramUseCase(diagrams),
    delete: new DeleteDiagramUseCase(diagrams),
  }, FRONTEND_URL));

  return app;
}

function _authHeaders(app: ReturnType<typeof express>) {
  return request(app)
    .get("/") // placeholder, overridden by caller
    .set("Authorization", `Bearer ${rawKey}`)
    .set("X-Drawhaus-Client", "test-suite");
}

// Helper to make authed requests
function api(app: ReturnType<typeof express>) {
  return {
    get: (url: string) =>
      request(app).get(url).set("Authorization", `Bearer ${rawKey}`).set("X-Drawhaus-Client", "test-suite"),
    post: (url: string) =>
      request(app).post(url).set("Authorization", `Bearer ${rawKey}`).set("X-Drawhaus-Client", "test-suite"),
    patch: (url: string) =>
      request(app).patch(url).set("Authorization", `Bearer ${rawKey}`).set("X-Drawhaus-Client", "test-suite"),
    delete: (url: string) =>
      request(app).delete(url).set("Authorization", `Bearer ${rawKey}`).set("X-Drawhaus-Client", "test-suite"),
  };
}

describe("/v1/health", () => {
  test("returns ok without auth", async () => {
    const app = createApp();
    const res = await request(app).get("/v1/health");

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.ok(res.body.version);
    assert.equal(res.body.database, "ok");
  });
});

describe("/v1/ auth middleware", () => {
  test("rejects request without Authorization header", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/v1/diagrams")
      .set("X-Drawhaus-Client", "test");

    assert.equal(res.status, 401);
  });

  test("rejects request without X-Drawhaus-Client header", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/v1/diagrams")
      .set("Authorization", `Bearer ${rawKey}`);

    assert.equal(res.status, 400);
    assert.match(res.body.error, /X-Drawhaus-Client/);
  });

  test("rejects invalid API key", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/v1/diagrams")
      .set("Authorization", "Bearer dhk_invalid_key")
      .set("X-Drawhaus-Client", "test");

    assert.equal(res.status, 401);
  });

  test("rejects non-dhk token format", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/v1/diagrams")
      .set("Authorization", "Bearer some_other_token")
      .set("X-Drawhaus-Client", "test");

    assert.equal(res.status, 401);
  });
});

describe("/v1/diagrams CRUD", () => {
  test("full lifecycle: create → list → get → update → delete", async () => {
    const app = createApp();
    const { post, get, patch, delete: del } = api(app);

    // Create
    const createRes = await post("/v1/diagrams").send({ title: "API Diagram" });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.data.title, "API Diagram");
    assert.equal(createRes.body.data.createdVia, "api");
    assert.ok(createRes.body.data.url.includes("/board/"));
    assert.ok(createRes.body.data.id);
    assert.ok(createRes.body.data.createdAt);
    assert.ok(createRes.body.data.updatedAt);
    // Scene data included in create response
    assert.ok("elements" in createRes.body.data);
    assert.ok("appState" in createRes.body.data);

    const diagramId = createRes.body.data.id as string;

    // List
    const listRes = await get("/v1/diagrams");
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.data.length, 1);
    assert.equal(listRes.body.total, 1);
    assert.equal(listRes.body.limit, 50);
    assert.equal(listRes.body.offset, 0);
    assert.equal(listRes.body.data[0].title, "API Diagram");
    // List does NOT include scene data
    assert.equal(listRes.body.data[0].elements, undefined);
    assert.equal(listRes.body.data[0].appState, undefined);

    // Get single
    const getRes = await get(`/v1/diagrams/${diagramId}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.id, diagramId);
    // Get includes scene data
    assert.ok("elements" in getRes.body.data);
    assert.ok("appState" in getRes.body.data);

    // Update
    const patchRes = await patch(`/v1/diagrams/${diagramId}`).send({ title: "Updated Title" });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.title, "Updated Title");

    // Delete
    const deleteRes = await del(`/v1/diagrams/${diagramId}`);
    assert.equal(deleteRes.status, 204);

    // Verify deleted
    const listAfter = await get("/v1/diagrams");
    assert.equal(listAfter.body.data.length, 0);
  });

  test("create defaults title to Untitled", async () => {
    const app = createApp();
    const res = await api(app).post("/v1/diagrams").send({});
    assert.equal(res.status, 201);
    assert.equal(res.body.data.title, "Untitled");
  });

  test("create with elements and appState", async () => {
    const app = createApp();
    const res = await api(app).post("/v1/diagrams").send({
      title: "With Scene",
      elements: [{ id: "el-1", type: "rectangle", text: "Hello" }],
      appState: { viewBackgroundColor: "#fff" },
    });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.data.elements, [{ id: "el-1", type: "rectangle", text: "Hello" }]);
    assert.deepEqual(res.body.data.appState, { viewBackgroundColor: "#fff" });
  });

  test("url field points to frontend board", async () => {
    const app = createApp();
    const res = await api(app).post("/v1/diagrams").send({ title: "URL test" });
    assert.equal(res.body.data.url, `${FRONTEND_URL}/board/${res.body.data.id}`);
  });

  test("patch requires at least one field", async () => {
    const app = createApp();
    const createRes = await api(app).post("/v1/diagrams").send({ title: "Test" });
    const id = createRes.body.data.id;

    const res = await api(app).patch(`/v1/diagrams/${id}`).send({});
    assert.equal(res.status, 400);
  });

  test("rejects invalid UUID in path", async () => {
    const app = createApp();
    const res = await api(app).get("/v1/diagrams/not-a-uuid");
    assert.equal(res.status, 400);
  });
});

describe("/v1/diagrams workspace scoping", () => {
  test("cannot access diagram from another workspace", async () => {
    const app = createApp();

    // Create a diagram directly in another workspace
    const otherDiagram = await diagrams.create({
      title: "Other WS Diagram",
      ownerId: userId,
      workspaceId: OTHER_WORKSPACE_ID,
    });

    // Try to get it via API (scoped to WORKSPACE_ID)
    const res = await api(app).get(`/v1/diagrams/${otherDiagram.id}`);
    assert.equal(res.status, 403);
  });

  test("cannot update diagram from another workspace", async () => {
    const app = createApp();

    const otherDiagram = await diagrams.create({
      title: "Other WS Diagram",
      ownerId: userId,
      workspaceId: OTHER_WORKSPACE_ID,
    });

    const res = await api(app).patch(`/v1/diagrams/${otherDiagram.id}`).send({ title: "Nope" });
    assert.equal(res.status, 403);
  });

  test("cannot delete diagram from another workspace", async () => {
    const app = createApp();

    const otherDiagram = await diagrams.create({
      title: "Other WS Diagram",
      ownerId: userId,
      workspaceId: OTHER_WORKSPACE_ID,
    });

    const res = await api(app).delete(`/v1/diagrams/${otherDiagram.id}`);
    assert.equal(res.status, 403);
  });

  test("list only returns diagrams from API key workspace", async () => {
    const app = createApp();

    // Create diagram in correct workspace
    await api(app).post("/v1/diagrams").send({ title: "My WS" });

    // Create diagram in another workspace directly
    await diagrams.create({
      title: "Other WS",
      ownerId: userId,
      workspaceId: OTHER_WORKSPACE_ID,
    });

    const res = await api(app).get("/v1/diagrams");
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].title, "My WS");
  });
});

describe("/v1/diagrams sanitization", () => {
  test("strips HTML tags from element text fields", async () => {
    const app = createApp();

    const res = await api(app).post("/v1/diagrams").send({
      title: "XSS Test",
      elements: [
        { id: "el-1", type: "text", text: "<script>alert('xss')</script>Hello" },
        { id: "el-2", type: "rectangle" },
      ],
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.elements[0].text, "alert('xss')Hello");
    assert.equal(res.body.data.elements[1].type, "rectangle");
  });

  test("strips HTML tags on update too", async () => {
    const app = createApp();
    const createRes = await api(app).post("/v1/diagrams").send({ title: "Test" });
    const id = createRes.body.data.id;

    const res = await api(app).patch(`/v1/diagrams/${id}`).send({
      elements: [{ id: "el-1", type: "text", text: "<b>bold</b> text" }],
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.elements[0].text, "bold text");
  });
});

describe("/v1/diagrams pagination", () => {
  test("supports limit and offset", async () => {
    const app = createApp();

    // Create 5 diagrams
    for (let i = 1; i <= 5; i++) {
      await api(app).post("/v1/diagrams").send({ title: `Diagram ${i}` });
    }

    const res = await api(app).get("/v1/diagrams?limit=2&offset=1");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.total, 5);
    assert.equal(res.body.limit, 2);
    assert.equal(res.body.offset, 1);
  });
});

describe("/v1/ request logging", () => {
  test("logs API requests", async () => {
    const app = createApp();

    await api(app).get("/v1/diagrams");

    // Give the finish event a tick to fire
    await new Promise((r) => setTimeout(r, 10));

    assert.ok(apiKeys.logs.length > 0);
    assert.equal(apiKeys.logs[0].method, "GET");
    assert.equal(apiKeys.logs[0].path, "/");
  });
});
