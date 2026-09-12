// Env setup runs at module-load via this side-effect import — must come first.
import "./_admin-env-setup";
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { GetCurrentUserUseCase } from "../../application/use-cases/auth/get-current-user";
import { ListWebhooksUseCase } from "../../application/use-cases/webhooks/list-webhooks";
import { CreateWebhookUseCase } from "../../application/use-cases/webhooks/create-webhook";
import { UpdateWebhookUseCase } from "../../application/use-cases/webhooks/update-webhook";
import { DeleteWebhookUseCase } from "../../application/use-cases/webhooks/delete-webhook";
import { RegenerateWebhookSecretUseCase } from "../../application/use-cases/webhooks/regenerate-webhook-secret";
import { ListWebhookDeliveriesUseCase } from "../../application/use-cases/webhooks/list-webhook-deliveries";
import { SendTestWebhookEventUseCase } from "../../application/use-cases/webhooks/send-test-webhook-event";
import { createAdminRoutes } from "../../infrastructure/http/routes/admin.routes";
import { createRequireAuth } from "../../infrastructure/http/middleware/require-auth";
import { WEBHOOK_EVENTS } from "../../domain/entities/webhook";
import { config } from "../../infrastructure/config";
import { InMemoryUserRepository } from "../fakes/in-memory-user-repository";
import { InMemorySessionRepository } from "../fakes/in-memory-session-repository";
import { InMemoryInvitationRepository } from "../fakes/in-memory-invitation-repository";
import { InMemoryWebhookRepository } from "../fakes/in-memory-webhook-repository";
import { FakeWebhookSender } from "../fakes/fake-webhook-sender";

const WEBHOOK_RESPONSE_KEYS = [
  "active",
  "createdAt",
  "description",
  "events",
  "id",
  "updatedAt",
  "url",
];

const DELIVERY_RESPONSE_KEYS = [
  "attempts",
  "createdAt",
  "deliveredAt",
  "eventId",
  "eventType",
  "id",
  "lastError",
  "nextAttemptAt",
  "payload",
  "status",
];

const alphabetically = (a: string, b: string) => a.localeCompare(b);

let users: InMemoryUserRepository;
let sessions: InMemorySessionRepository;
let repo: InMemoryWebhookRepository;
let sender: FakeWebhookSender;

function buildApp(opts?: { withWebhooks?: boolean }) {
  users = new InMemoryUserRepository();
  sessions = new InMemorySessionRepository(() => users.store);
  repo = new InMemoryWebhookRepository();
  sender = new FakeWebhookSender();

  const requireAuth = createRequireAuth(new GetCurrentUserUseCase(sessions));
  const webhooks =
    opts?.withWebhooks === false
      ? undefined
      : {
          list: new ListWebhooksUseCase(repo),
          create: new CreateWebhookUseCase(repo),
          update: new UpdateWebhookUseCase(repo),
          remove: new DeleteWebhookUseCase(repo),
          regenerateSecret: new RegenerateWebhookSecretUseCase(repo),
          listDeliveries: new ListWebhookDeliveriesUseCase(repo),
          sendTest: new SendTestWebhookEventUseCase(repo, sender),
        };

  const app = express();
  app.use(express.json());
  app.use(
    "/api/admin",
    createAdminRoutes(
      {} as unknown as Parameters<typeof createAdminRoutes>[0],
      requireAuth,
      new InMemoryInvitationRepository(),
      undefined,
      webhooks,
    ),
  );
  return app;
}

async function signIn(role: "admin" | "user") {
  const user = await users.create({
    email: `${role}-${users.store.length}@example.com`,
    name: role,
    passwordHash: null,
  });
  user.role = role;
  const session = await sessions.create(user.id);
  return `${config.cookieName}=${session.token}`;
}

async function createWebhook(app: express.Express, cookie: string, body?: object) {
  const res = await request(app)
    .post("/api/admin/webhooks")
    .set("Cookie", cookie)
    .send({ url: "https://example.com/hook", events: ["diagram.created"], ...body });
  return res;
}

let app: express.Express;
let adminCookie: string;

beforeEach(async () => {
  app = buildApp();
  adminCookie = await signIn("admin");
});

test("GET /webhooks reports the available events and an empty registry", async () => {
  const res = await request(app).get("/api/admin/webhooks").set("Cookie", adminCookie);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.webhooks, []);
  assert.deepEqual(res.body.events, [...WEBHOOK_EVENTS]);
  assert.equal(res.body.encryptionEnabled, true);
});

test("POST /webhooks creates one and returns the generated secret once", async () => {
  const res = await createWebhook(app, adminCookie, {
    description: "CI rebuild",
    events: ["diagram.created", "diagram.updated"],
  });

  assert.equal(res.status, 201);
  assert.match(res.body.secret, /^whsec_[0-9a-f]{64}$/);
  assert.equal(res.body.webhook.url, "https://example.com/hook");
  assert.equal(res.body.webhook.description, "CI rebuild");
  assert.deepEqual(res.body.webhook.events, ["diagram.created", "diagram.updated"]);
  assert.equal(res.body.webhook.active, true);
  assert.equal(await repo.findSecret(res.body.webhook.id), res.body.secret);
});

test("the secret never appears again after creation", async () => {
  const created = await createWebhook(app, adminCookie);
  const secret: string = created.body.secret;
  const id: string = created.body.webhook.id;
  await repo.enqueue([
    {
      webhookId: id,
      eventId: "11111111-1111-4111-8111-111111111111",
      eventType: "diagram.created",
      payload: {
        id: "11111111-1111-4111-8111-111111111111",
        event: "diagram.created",
        createdAt: new Date().toISOString(),
        actorId: null,
        data: {},
      },
    },
  ]);

  const list = await request(app).get("/api/admin/webhooks").set("Cookie", adminCookie);
  const deliveries = await request(app)
    .get(`/api/admin/webhooks/${id}/deliveries`)
    .set("Cookie", adminCookie);
  const updated = await request(app)
    .patch(`/api/admin/webhooks/${id}`)
    .set("Cookie", adminCookie)
    .send({ active: false });

  for (const res of [list, deliveries, updated]) {
    assert.equal(res.status, 200);
    const body = JSON.stringify(res.body);
    assert.ok(!body.includes(secret), "plaintext secret leaked into a read response");
    for (const field of [
      "secret",
      "encryptedSecret",
      "encrypted_secret",
      "iv",
      "secret_iv",
      "authTag",
      "secret_auth_tag",
    ]) {
      assert.ok(!body.includes(`"${field}"`), `${field} leaked into a read response`);
    }
  }

  assert.deepEqual(Object.keys(list.body.webhooks[0]).sort(alphabetically), WEBHOOK_RESPONSE_KEYS);
  assert.deepEqual(Object.keys(updated.body.webhook).sort(alphabetically), WEBHOOK_RESPONSE_KEYS);
  assert.deepEqual(
    Object.keys(deliveries.body.deliveries[0]).sort(alphabetically),
    DELIVERY_RESPONSE_KEYS,
  );
});

test("PATCH ignores a secret field smuggled into the body", async () => {
  const created = await createWebhook(app, adminCookie);
  const id: string = created.body.webhook.id;

  const res = await request(app)
    .patch(`/api/admin/webhooks/${id}`)
    .set("Cookie", adminCookie)
    .send({ active: false, secret: "attacker-chosen" });

  assert.equal(res.status, 200);
  assert.equal(await repo.findSecret(id), created.body.secret);
});

test("POST /webhooks rejects invalid input", async () => {
  const cases: { body: object; message: RegExp }[] = [
    { body: { url: "https://example.com", events: [] }, message: /Invalid request body/ },
    { body: { url: "https://example.com" }, message: /Invalid request body/ },
    { body: { url: "https://example.com", events: ["nope"] }, message: /Invalid request body/ },
    { body: { events: ["diagram.created"] }, message: /Invalid request body/ },
  ];

  for (const { body, message } of cases) {
    const res = await request(app)
      .post("/api/admin/webhooks")
      .set("Cookie", adminCookie)
      .send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.match(res.body.error, message);
  }
});

test("POST /webhooks maps every URL-policy rejection to a 400 with its reason", async () => {
  const cases: [string, RegExp][] = [
    ["not-a-url", /not a valid URL/],
    ["ftp://example.com/hook", /must use http or https/],
    ["https://user:pass@example.com/hook", /must not embed credentials/],
  ];

  for (const [url, message] of cases) {
    const res = await createWebhook(app, adminCookie, { url });
    assert.equal(res.status, 400, url);
    assert.match(res.body.error, message);
  }
  assert.equal(repo.webhooks.length, 0);
});

test("PATCH /webhooks/:id updates the editable fields and validates the URL", async () => {
  const created = await createWebhook(app, adminCookie);
  const id: string = created.body.webhook.id;

  const ok = await request(app)
    .patch(`/api/admin/webhooks/${id}`)
    .set("Cookie", adminCookie)
    .send({
      url: "https://other.example.com/hook",
      description: "moved",
      events: ["template.created"],
      active: false,
    });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.webhook.url, "https://other.example.com/hook");
  assert.equal(ok.body.webhook.description, "moved");
  assert.deepEqual(ok.body.webhook.events, ["template.created"]);
  assert.equal(ok.body.webhook.active, false);

  const bad = await request(app)
    .patch(`/api/admin/webhooks/${id}`)
    .set("Cookie", adminCookie)
    .send({ url: "ftp://example.com" });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /must use http or https/);

  const empty = await request(app)
    .patch(`/api/admin/webhooks/${id}`)
    .set("Cookie", adminCookie)
    .send({});
  assert.equal(empty.status, 400);
});

test("PATCH and DELETE answer 404 for an unknown webhook", async () => {
  const missing = "22222222-2222-4222-8222-222222222222";

  const patched = await request(app)
    .patch(`/api/admin/webhooks/${missing}`)
    .set("Cookie", adminCookie)
    .send({ active: false });
  assert.equal(patched.status, 404);

  const deleted = await request(app)
    .delete(`/api/admin/webhooks/${missing}`)
    .set("Cookie", adminCookie);
  assert.equal(deleted.status, 404);
});

test("DELETE /webhooks/:id removes it", async () => {
  const created = await createWebhook(app, adminCookie);
  const id: string = created.body.webhook.id;

  const res = await request(app).delete(`/api/admin/webhooks/${id}`).set("Cookie", adminCookie);

  assert.equal(res.status, 200);
  assert.deepEqual(repo.webhooks, []);
  assert.equal(await repo.findSecret(id), null);
});

test("POST /webhooks/:id/secret replaces the secret and returns the new one once", async () => {
  const created = await createWebhook(app, adminCookie);
  const id: string = created.body.webhook.id;

  const res = await request(app)
    .post(`/api/admin/webhooks/${id}/secret`)
    .set("Cookie", adminCookie);

  assert.equal(res.status, 200);
  assert.match(res.body.secret, /^whsec_[0-9a-f]{64}$/);
  assert.notEqual(res.body.secret, created.body.secret);
  assert.equal(await repo.findSecret(id), res.body.secret);
  assert.ok(!Object.keys(res.body.webhook).includes("secret"));
});

test("GET /webhooks/:id/deliveries returns the failure log and honours limit", async () => {
  const created = await createWebhook(app, adminCookie);
  const id: string = created.body.webhook.id;
  for (const event of ["diagram.created", "diagram.updated"] as const) {
    await repo.enqueue([
      {
        webhookId: id,
        eventId: `3333${event.length}333-3333-4333-8333-333333333333`,
        eventType: event,
        payload: {
          id: `3333${event.length}333-3333-4333-8333-333333333333`,
          event,
          createdAt: new Date().toISOString(),
          actorId: null,
          data: {},
        },
      },
    ]);
  }
  await repo.markFailed(repo.deliveries[1].id, "HTTP 500");

  const all = await request(app)
    .get(`/api/admin/webhooks/${id}/deliveries`)
    .set("Cookie", adminCookie);
  assert.equal(all.status, 200);
  assert.equal(all.body.deliveries.length, 2);
  const failed = all.body.deliveries.find(
    (d: { status: string }) => d.status === "failed",
  ) as unknown as { lastError: string; eventType: string };
  assert.equal(failed.lastError, "HTTP 500");
  assert.equal(failed.eventType, "diagram.updated");

  const limited = await request(app)
    .get(`/api/admin/webhooks/${id}/deliveries?limit=1`)
    .set("Cookie", adminCookie);
  assert.equal(limited.status, 200);
  assert.equal(limited.body.deliveries.length, 1);

  const missing = await request(app)
    .get("/api/admin/webhooks/22222222-2222-4222-8222-222222222222/deliveries")
    .set("Cookie", adminCookie);
  assert.equal(missing.status, 404);
});

test("POST /webhooks/:id/test signs a test event with the stored secret", async () => {
  const created = await createWebhook(app, adminCookie);
  const id: string = created.body.webhook.id;

  const res = await request(app).post(`/api/admin/webhooks/${id}/test`).set("Cookie", adminCookie);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.result, { ok: true, status: 200 });
  assert.equal(sender.requests.length, 1);
  assert.equal(sender.requests[0].url, "https://example.com/hook");
  assert.equal(sender.requests[0].secret, created.body.secret);
  assert.equal(sender.requests[0].eventType, "webhook.test");
  assert.equal(JSON.parse(sender.requests[0].body).event, "webhook.test");
  assert.deepEqual(repo.deliveries, []);
});

test("POST /webhooks/:id/test reports a receiver failure instead of erroring", async () => {
  const created = await createWebhook(app, adminCookie);
  sender.result = { ok: false, error: "HTTP 503" };

  const res = await request(app)
    .post(`/api/admin/webhooks/${created.body.webhook.id}/test`)
    .set("Cookie", adminCookie);

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.result, { ok: false, error: "HTTP 503" });
});

test("a non-admin is refused on every webhook endpoint", async () => {
  const created = await createWebhook(app, adminCookie);
  const id: string = created.body.webhook.id;
  const cookie = await signIn("user");

  const responses = await Promise.all([
    request(app).get("/api/admin/webhooks").set("Cookie", cookie),
    request(app).post("/api/admin/webhooks").set("Cookie", cookie).send({ url: "https://e.com" }),
    request(app).patch(`/api/admin/webhooks/${id}`).set("Cookie", cookie).send({ active: false }),
    request(app).delete(`/api/admin/webhooks/${id}`).set("Cookie", cookie),
    request(app).post(`/api/admin/webhooks/${id}/secret`).set("Cookie", cookie),
    request(app).get(`/api/admin/webhooks/${id}/deliveries`).set("Cookie", cookie),
    request(app).post(`/api/admin/webhooks/${id}/test`).set("Cookie", cookie),
  ]);

  for (const res of responses) assert.equal(res.status, 403);
  assert.equal(repo.webhooks.length, 1);
});

test("an anonymous caller is refused", async () => {
  const res = await request(app).get("/api/admin/webhooks");
  assert.equal(res.status, 401);
});

test("without ENCRYPTION_KEY the list degrades and every mutation explains why", async () => {
  app = buildApp({ withWebhooks: false });
  adminCookie = await signIn("admin");
  const id = "22222222-2222-4222-8222-222222222222";

  const list = await request(app).get("/api/admin/webhooks").set("Cookie", adminCookie);
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.webhooks, []);
  assert.deepEqual(list.body.events, [...WEBHOOK_EVENTS]);
  assert.equal(list.body.encryptionEnabled, false);

  const blocked = await Promise.all([
    request(app)
      .post("/api/admin/webhooks")
      .set("Cookie", adminCookie)
      .send({ url: "https://example.com/hook", events: ["diagram.created"] }),
    request(app)
      .patch(`/api/admin/webhooks/${id}`)
      .set("Cookie", adminCookie)
      .send({ active: false }),
    request(app).delete(`/api/admin/webhooks/${id}`).set("Cookie", adminCookie),
    request(app).post(`/api/admin/webhooks/${id}/secret`).set("Cookie", adminCookie),
    request(app).get(`/api/admin/webhooks/${id}/deliveries`).set("Cookie", adminCookie),
    request(app).post(`/api/admin/webhooks/${id}/test`).set("Cookie", adminCookie),
  ]);

  for (const res of blocked) {
    assert.equal(res.status, 400);
    assert.match(res.body.error, /ENCRYPTION_KEY not configured/);
  }
});
