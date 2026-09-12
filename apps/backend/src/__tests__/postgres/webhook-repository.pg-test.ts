import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { config } from "../../infrastructure/config";
import { pool } from "../../infrastructure/db";
import { PgWebhookRepository } from "../../infrastructure/persistence/pg-webhook-repository";
import type { WebhookPayload } from "../../domain/entities/webhook";
import { useTestDatabase } from "./test-database";

useTestDatabase();

const KEY = "a".repeat(64);
const webhooks = new PgWebhookRepository(KEY);

const LEASE_MS = 60_000;

const byId = (a: string, b: string) => a.localeCompare(b);

function payload(id: string): WebhookPayload {
  return {
    id,
    event: "diagram.created",
    createdAt: new Date().toISOString(),
    actorId: "user-1",
    data: { id: "diagram-1" },
  };
}

async function newWebhook(overrides: { active?: boolean; secret?: string } = {}) {
  return webhooks.create({
    url: "https://receiver.test/hook",
    secret: overrides.secret ?? "whsec_one",
    description: "CI",
    events: ["diagram.created", "template.created"],
    active: overrides.active,
  });
}

async function enqueueOne(webhookId: string) {
  const eventId = randomUUID();
  await webhooks.enqueue([
    { webhookId, eventId, eventType: "diagram.created", payload: payload(eventId) },
  ]);
  const delivery = (await webhooks.listDeliveries(webhookId, 10)).find(
    (d) => d.eventId === eventId,
  );
  assert.ok(delivery);
  return delivery;
}

describe("PgWebhookRepository — configuration", () => {
  it("round-trips a webhook and keeps its secret out of the entity", async () => {
    const created = await newWebhook();

    const found = await webhooks.findById(created.id);
    assert.deepEqual(found?.events, ["diagram.created", "template.created"]);
    assert.equal(found?.url, "https://receiver.test/hook");
    assert.equal(found?.description, "CI");
    assert.equal(found?.active, true);
    assert.equal(Object.keys(found ?? {}).includes("secret"), false);
  });

  it("stores the secret encrypted and hands back the plaintext only through findSecret", async () => {
    const created = await newWebhook({ secret: "whsec_plain" });

    const { rows } = await pool.query<{ encrypted_secret: string }>(
      "SELECT encrypted_secret FROM webhooks WHERE id = $1",
      [created.id],
    );
    assert.notEqual(rows[0].encrypted_secret, "whsec_plain");
    assert.equal(await webhooks.findSecret(created.id), "whsec_plain");
  });

  it("findSecret returns null for a webhook that no longer exists", async () => {
    assert.equal(await webhooks.findSecret(randomUUID()), null);
  });

  it("findActiveForEvent returns only active webhooks subscribed to that event", async () => {
    const subscribed = await newWebhook();
    await newWebhook({ active: false });
    await webhooks.create({
      url: "https://other.test/hook",
      secret: "s",
      events: ["diagram.deleted"],
    });

    const found = await webhooks.findActiveForEvent("diagram.created");
    assert.deepEqual(
      found.map((w) => w.id),
      [subscribed.id],
    );
    assert.deepEqual(await webhooks.findActiveForEvent("diagram.updated"), []);
  });

  it("update rotates the secret and narrows the subscription", async () => {
    const created = await newWebhook();

    const updated = await webhooks.update(created.id, {
      secret: "whsec_two",
      events: ["diagram.deleted"],
      active: false,
    });

    assert.deepEqual(updated?.events, ["diagram.deleted"]);
    assert.equal(updated?.active, false);
    assert.equal(await webhooks.findSecret(created.id), "whsec_two");
    assert.deepEqual(await webhooks.findActiveForEvent("diagram.created"), []);
  });

  it("update with nothing to change leaves the row as it was", async () => {
    const created = await newWebhook();

    const updated = await webhooks.update(created.id, {});

    assert.equal(updated?.updatedAt.getTime(), created.updatedAt.getTime());
    assert.equal(await webhooks.findSecret(created.id), "whsec_one");
  });

  it("deleting a webhook takes its deliveries with it", async () => {
    const created = await newWebhook();
    await enqueueOne(created.id);

    await webhooks.delete(created.id);

    const { rows } = await pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM webhook_deliveries",
    );
    assert.equal(rows[0].count, "0");
  });
});

describe("PgWebhookRepository — the outbox", () => {
  it("claims a due delivery once, counting the attempt and holding it for the lease", async () => {
    const webhook = await newWebhook();
    await enqueueOne(webhook.id);

    const [claimed] = await webhooks.claimDue(10, LEASE_MS);
    assert.equal(claimed.attempts, 1);
    assert.equal(claimed.status, "pending");
    assert.deepEqual(claimed.payload.data, { id: "diagram-1" });
    assert.ok(claimed.nextAttemptAt.getTime() > Date.now() + LEASE_MS / 2);

    assert.deepEqual(await webhooks.claimDue(10, LEASE_MS), []);
  });

  it("leaves a delivery whose backoff has not elapsed, and takes it once it has", async () => {
    const webhook = await newWebhook();
    const delivery = await enqueueOne(webhook.id);
    await webhooks.markRetry(delivery.id, new Date(Date.now() + 60_000), "HTTP 500");

    assert.deepEqual(await webhooks.claimDue(10, LEASE_MS), []);

    await webhooks.markRetry(delivery.id, new Date(Date.now() - 1000), "HTTP 500");
    const [claimed] = await webhooks.claimDue(10, LEASE_MS);
    assert.equal(claimed.id, delivery.id);
    assert.equal(claimed.lastError, "HTTP 500");
  });

  it("never claims a delivered or dead-lettered row", async () => {
    const webhook = await newWebhook();
    const delivered = await enqueueOne(webhook.id);
    await webhooks.markDelivered(delivered.id);
    const dead = await enqueueOne(webhook.id);
    await webhooks.markFailed(dead.id, "gave up");

    assert.deepEqual(await webhooks.claimDue(10, LEASE_MS), []);
  });

  it("skips a row another transaction already holds instead of waiting for it", async () => {
    const webhook = await newWebhook();
    const locked = await enqueueOne(webhook.id);
    const other = await enqueueOne(webhook.id);

    const holder = new Client({ connectionString: config.databaseUrl });
    await holder.connect();
    try {
      await holder.query("BEGIN");
      await holder.query("SELECT id FROM webhook_deliveries WHERE id = $1 FOR UPDATE", [locked.id]);

      const claimed = await webhooks.claimDue(10, LEASE_MS);

      assert.deepEqual(
        claimed.map((d) => d.id),
        [other.id],
      );
    } finally {
      await holder.query("ROLLBACK");
      await holder.end();
    }
  });

  it("markDelivered closes the row and clears the last error", async () => {
    const webhook = await newWebhook();
    const delivery = await enqueueOne(webhook.id);
    await webhooks.markRetry(delivery.id, new Date(0), "HTTP 500");

    await webhooks.markDelivered(delivery.id);

    const [stored] = await webhooks.listDeliveries(webhook.id, 1);
    assert.equal(stored.id, delivery.id);
    assert.equal(stored.status, "delivered");
    assert.equal(stored.lastError, null);
    assert.ok(stored.deliveredAt);
  });

  it("markFailed keeps the reason so the dead-letter log can be read back", async () => {
    const webhook = await newWebhook();
    const delivery = await enqueueOne(webhook.id);

    await webhooks.markFailed(delivery.id, "HTTP 500");

    const [stored] = await webhooks.listDeliveries(webhook.id, 1);
    assert.equal(stored.status, "failed");
    assert.equal(stored.lastError, "HTTP 500");
  });

  it("enqueue writes one row per webhook under a shared event id", async () => {
    const first = await newWebhook();
    const second = await newWebhook();
    const eventId = randomUUID();

    await webhooks.enqueue([
      { webhookId: first.id, eventId, eventType: "diagram.created", payload: payload(eventId) },
      { webhookId: second.id, eventId, eventType: "diagram.created", payload: payload(eventId) },
    ]);

    const claimed = await webhooks.claimDue(10, LEASE_MS);
    assert.equal(claimed.length, 2);
    assert.deepEqual(claimed.map((d) => d.webhookId).sort(byId), [first.id, second.id].sort(byId));
    assert.equal(new Set(claimed.map((d) => d.eventId)).size, 1);
  });

  it("enqueue with nothing to write touches no rows", async () => {
    await webhooks.enqueue([]);

    const { rows } = await pool.query<{ count: string }>(
      "SELECT count(*) AS count FROM webhook_deliveries",
    );
    assert.equal(rows[0].count, "0");
  });
});
