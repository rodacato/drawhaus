import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { OutboxWebhookDispatcher } from "../../../infrastructure/services/webhook-dispatcher";
import { InMemoryWebhookRepository } from "../../fakes/in-memory-webhook-repository";
import type { WebhookRepository } from "../../../domain/ports/webhook-repository";

const EMISSION = {
  event: "diagram.created",
  actorId: "user-1",
  data: { id: "diagram-1" },
} as const;

const byId = (a: string, b: string) => a.localeCompare(b);

describe("OutboxWebhookDispatcher", () => {
  it("queues one delivery per subscribed active webhook, sharing a single event id", async () => {
    const repo = new InMemoryWebhookRepository();
    const first = await repo.create({
      url: "https://a.test/hook",
      secret: "s",
      events: ["diagram.created", "diagram.deleted"],
    });
    const second = await repo.create({
      url: "https://b.test/hook",
      secret: "s",
      events: ["diagram.created"],
    });

    await new OutboxWebhookDispatcher(repo).enqueue({ ...EMISSION });

    assert.deepEqual(
      repo.deliveries.map((d) => d.webhookId).sort(byId),
      [first.id, second.id].sort(byId),
    );
    assert.equal(new Set(repo.deliveries.map((d) => d.eventId)).size, 1);
    assert.equal(repo.deliveries[0].payload.id, repo.deliveries[0].eventId);
    assert.deepEqual(repo.deliveries[0].payload.data, { id: "diagram-1" });
    assert.equal(repo.deliveries[0].payload.actorId, "user-1");
  });

  it("skips webhooks that are inactive or not subscribed to the event", async () => {
    const repo = new InMemoryWebhookRepository();
    await repo.create({
      url: "https://off.test/hook",
      secret: "s",
      events: ["diagram.created"],
      active: false,
    });
    await repo.create({
      url: "https://other.test/hook",
      secret: "s",
      events: ["template.created"],
    });

    await new OutboxWebhookDispatcher(repo).enqueue({ ...EMISSION });

    assert.equal(repo.deliveries.length, 0);
  });

  it("dispatch swallows a repository failure instead of reaching the caller", async () => {
    const broken = {
      findActiveForEvent: () => Promise.reject(new Error("database down")),
    } as unknown as WebhookRepository;

    assert.doesNotThrow(() => new OutboxWebhookDispatcher(broken).dispatch({ ...EMISSION }));
    await sleep(10);
  });
});
