import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { diagramsRouter } from "./diagrams";
import { pool } from "./db";

type User = {
  id: string;
  email: string;
  name: string;
};

type Session = {
  id: string;
  user_id: string;
  expires_at: string;
};

type Diagram = {
  id: string;
  owner_id: string;
  title: string;
  elements: unknown[];
  app_state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const users = new Map<string, User>();
const sessions = new Map<string, Session>();
const diagrams = new Map<string, Diagram>();
const diagramMembers = new Map<string, "editor" | "viewer">();
let diagramSeq = 1;
let tick = 1;

const originalQuery = pool.query.bind(pool);

function key(diagramId: string, userId: string): string {
  return `${diagramId}:${userId}`;
}

function nowIso(): string {
  tick += 1;
  return new Date(1700000000000 + tick * 1000).toISOString();
}

function appWithDiagrams() {
  const app = express();
  app.use(express.json());
  app.use("/api/diagrams", diagramsRouter);
  return app;
}

function seedUser(id: string, email: string): string {
  users.set(id, { id, email, name: id });
  const token = `token-${id}`;
  sessions.set(token, {
    id: token,
    user_id: id,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  });
  return token;
}

before(() => {
  (pool as unknown as { query: typeof pool.query }).query = (async (
    text: string,
    params?: unknown[]
  ) => {
    const sql = text.replace(/\s+/g, " ").trim();

    if (
      sql.startsWith(
        "SELECT s.id, s.user_id, s.expires_at, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = $1 LIMIT 1"
      )
    ) {
      const token = params?.[0] as string;
      const session = sessions.get(token);
      if (!session) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      const user = users.get(session.user_id);
      if (!user) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      return {
        rows: [
          {
            id: session.id,
            user_id: session.user_id,
            expires_at: session.expires_at,
            email: user.email,
            name: user.name,
          },
        ],
        rowCount: 1,
      } as unknown;
    }

    if (sql.startsWith("DELETE FROM sessions WHERE id = $1")) {
      const token = params?.[0] as string;
      sessions.delete(token);
      return { rows: [], rowCount: 1 } as unknown;
    }

    if (
      sql.startsWith(
        "SELECT DISTINCT d.id, d.owner_id, d.title, d.elements, d.app_state, d.created_at, d.updated_at FROM diagrams d LEFT JOIN diagram_members dm ON dm.diagram_id = d.id WHERE d.owner_id = $1 OR dm.user_id = $1 ORDER BY d.updated_at DESC"
      )
    ) {
      const userId = params?.[0] as string;
      const rows = [...diagrams.values()]
        .filter(
          (diagram) =>
            diagram.owner_id === userId || diagramMembers.has(key(diagram.id, userId))
        )
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
      return { rows, rowCount: rows.length } as unknown;
    }

    if (
      sql.startsWith(
        "INSERT INTO diagrams (owner_id, title) VALUES ($1, $2) RETURNING id, owner_id, title, elements, app_state, created_at, updated_at"
      )
    ) {
      const ownerId = params?.[0] as string;
      const title = params?.[1] as string;
      const timestamp = nowIso();
      const diagram: Diagram = {
        id: `diagram-${diagramSeq++}`,
        owner_id: ownerId,
        title,
        elements: [],
        app_state: {},
        created_at: timestamp,
        updated_at: timestamp,
      };
      diagrams.set(diagram.id, diagram);
      return { rows: [diagram], rowCount: 1 } as unknown;
    }

    if (
      sql.startsWith(
        "SELECT d.id, d.owner_id, dm.role FROM diagrams d LEFT JOIN diagram_members dm ON dm.diagram_id = d.id AND dm.user_id = $2 WHERE d.id = $1 AND (d.owner_id = $2 OR dm.user_id IS NOT NULL) LIMIT 1"
      )
    ) {
      const diagramId = params?.[0] as string;
      const userId = params?.[1] as string;
      const diagram = diagrams.get(diagramId);
      if (!diagram) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      const role = diagramMembers.get(key(diagramId, userId)) ?? null;
      if (diagram.owner_id !== userId && !role) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      return {
        rows: [{ id: diagram.id, owner_id: diagram.owner_id, role }],
        rowCount: 1,
      } as unknown;
    }

    if (
      sql.startsWith(
        "SELECT id, owner_id, title, elements, app_state, created_at, updated_at FROM diagrams WHERE id = $1 LIMIT 1"
      )
    ) {
      const diagramId = params?.[0] as string;
      const diagram = diagrams.get(diagramId);
      if (!diagram) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      return { rows: [diagram], rowCount: 1 } as unknown;
    }

    if (
      sql.startsWith(
        "UPDATE diagrams SET"
      ) &&
      sql.includes("RETURNING id, owner_id, title, elements, app_state, created_at, updated_at")
    ) {
      let cursor = 0;
      const title = sql.includes("title = $") ? (params?.[cursor++] as string) : undefined;
      const elements = sql.includes("elements = $")
        ? (JSON.parse(params?.[cursor++] as string) as unknown[])
        : undefined;
      const appState = sql.includes("app_state = $")
        ? (JSON.parse(params?.[cursor++] as string) as Record<string, unknown>)
        : undefined;
      const diagramId = params?.[cursor] as string;

      const diagram = diagrams.get(diagramId);
      if (!diagram) {
        return { rows: [], rowCount: 0 } as unknown;
      }

      if (title !== undefined) {
        diagram.title = title;
      }
      if (elements !== undefined) {
        diagram.elements = elements;
      }
      if (appState !== undefined) {
        diagram.app_state = appState;
      }
      diagram.updated_at = nowIso();
      diagrams.set(diagramId, diagram);
      return { rows: [diagram], rowCount: 1 } as unknown;
    }

    if (sql.startsWith("SELECT owner_id FROM diagrams WHERE id = $1 LIMIT 1")) {
      const diagramId = params?.[0] as string;
      const diagram = diagrams.get(diagramId);
      if (!diagram) {
        return { rows: [], rowCount: 0 } as unknown;
      }
      return { rows: [{ owner_id: diagram.owner_id }], rowCount: 1 } as unknown;
    }

    if (sql.startsWith("DELETE FROM diagrams WHERE id = $1")) {
      const diagramId = params?.[0] as string;
      diagrams.delete(diagramId);
      for (const entry of diagramMembers.keys()) {
        if (entry.startsWith(`${diagramId}:`)) {
          diagramMembers.delete(entry);
        }
      }
      return { rows: [], rowCount: 1 } as unknown;
    }

    throw new Error(`Unexpected query in diagrams test: ${sql}`);
  }) as typeof pool.query;
});

after(() => {
  (pool as unknown as { query: typeof pool.query }).query = originalQuery;
});

beforeEach(() => {
  users.clear();
  sessions.clear();
  diagrams.clear();
  diagramMembers.clear();
  diagramSeq = 1;
  tick = 1;
});

test("diagram CRUD works for owner", async () => {
  const token = seedUser("owner-1", "owner@example.com");
  const app = appWithDiagrams();

  const createRes = await request(app)
    .post("/api/diagrams")
    .set("Cookie", `drawhaus_session=${token}`)
    .send({ title: "Roadmap" });
  assert.equal(createRes.status, 201);
  const diagramId = createRes.body.diagram.id as string;
  const firstUpdatedAt = createRes.body.diagram.updatedAt as string;

  const listRes = await request(app)
    .get("/api/diagrams")
    .set("Cookie", `drawhaus_session=${token}`);
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.diagrams.length, 1);
  assert.equal(listRes.body.diagrams[0].title, "Roadmap");

  const getRes = await request(app)
    .get(`/api/diagrams/${diagramId}`)
    .set("Cookie", `drawhaus_session=${token}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.diagram.id, diagramId);

  const patchRes = await request(app)
    .patch(`/api/diagrams/${diagramId}`)
    .set("Cookie", `drawhaus_session=${token}`)
    .send({
      title: "Roadmap v2",
      elements: [{ id: "el-1" }],
      appState: { viewBackgroundColor: "#fff" },
    });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.diagram.title, "Roadmap v2");
  assert.notEqual(patchRes.body.diagram.updatedAt, firstUpdatedAt);

  const deleteRes = await request(app)
    .delete(`/api/diagrams/${diagramId}`)
    .set("Cookie", `drawhaus_session=${token}`);
  assert.equal(deleteRes.status, 200);

  const listAfterDelete = await request(app)
    .get("/api/diagrams")
    .set("Cookie", `drawhaus_session=${token}`);
  assert.equal(listAfterDelete.status, 200);
  assert.equal(listAfterDelete.body.diagrams.length, 0);
});

test("membership and permissions are enforced", async () => {
  const ownerToken = seedUser("owner-1", "owner@example.com");
  const memberToken = seedUser("member-1", "member@example.com");
  const app = appWithDiagrams();

  const createRes = await request(app)
    .post("/api/diagrams")
    .set("Cookie", `drawhaus_session=${ownerToken}`)
    .send({ title: "Shared board" });
  assert.equal(createRes.status, 201);
  const diagramId = createRes.body.diagram.id as string;

  diagramMembers.set(key(diagramId, "member-1"), "viewer");

  const memberList = await request(app)
    .get("/api/diagrams")
    .set("Cookie", `drawhaus_session=${memberToken}`);
  assert.equal(memberList.status, 200);
  assert.equal(memberList.body.diagrams.length, 1);

  const memberGet = await request(app)
    .get(`/api/diagrams/${diagramId}`)
    .set("Cookie", `drawhaus_session=${memberToken}`);
  assert.equal(memberGet.status, 200);

  const viewerPatch = await request(app)
    .patch(`/api/diagrams/${diagramId}`)
    .set("Cookie", `drawhaus_session=${memberToken}`)
    .send({ title: "Nope" });
  assert.equal(viewerPatch.status, 403);

  diagramMembers.set(key(diagramId, "member-1"), "editor");
  const editorPatch = await request(app)
    .patch(`/api/diagrams/${diagramId}`)
    .set("Cookie", `drawhaus_session=${memberToken}`)
    .send({ title: "Edited by member" });
  assert.equal(editorPatch.status, 200);
  assert.equal(editorPatch.body.diagram.title, "Edited by member");

  const memberDelete = await request(app)
    .delete(`/api/diagrams/${diagramId}`)
    .set("Cookie", `drawhaus_session=${memberToken}`);
  assert.equal(memberDelete.status, 403);
});

test("unauthenticated requests are blocked", async () => {
  const app = appWithDiagrams();
  const res = await request(app).get("/api/diagrams");
  assert.equal(res.status, 401);
});
