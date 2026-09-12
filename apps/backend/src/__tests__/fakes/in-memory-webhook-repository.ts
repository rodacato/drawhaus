import { randomUUID } from "node:crypto";
import type {
  DeliveryDraft,
  WebhookDraft,
  WebhookPatch,
  WebhookRepository,
} from "../../domain/ports/webhook-repository";
import type { Webhook, WebhookDelivery, WebhookEvent } from "../../domain/entities/webhook";

export class InMemoryWebhookRepository implements WebhookRepository {
  readonly webhooks: Webhook[] = [];
  readonly deliveries: WebhookDelivery[] = [];
  private readonly secrets = new Map<string, string>();

  create(draft: WebhookDraft): Promise<Webhook> {
    const now = new Date();
    const webhook: Webhook = {
      id: randomUUID(),
      url: draft.url,
      description: draft.description ?? "",
      events: draft.events,
      active: draft.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.webhooks.push(webhook);
    this.secrets.set(webhook.id, draft.secret);
    return Promise.resolve(webhook);
  }

  findById(id: string): Promise<Webhook | null> {
    return Promise.resolve(this.webhooks.find((w) => w.id === id) ?? null);
  }

  list(): Promise<Webhook[]> {
    return Promise.resolve([...this.webhooks]);
  }

  async update(id: string, patch: WebhookPatch): Promise<Webhook | null> {
    const webhook = await this.findById(id);
    if (!webhook) return null;
    if (patch.url !== undefined) webhook.url = patch.url;
    if (patch.description !== undefined) webhook.description = patch.description;
    if (patch.events !== undefined) webhook.events = patch.events;
    if (patch.active !== undefined) webhook.active = patch.active;
    if (patch.secret !== undefined) this.secrets.set(id, patch.secret);
    webhook.updatedAt = new Date();
    return webhook;
  }

  delete(id: string): Promise<void> {
    const index = this.webhooks.findIndex((w) => w.id === id);
    if (index >= 0) this.webhooks.splice(index, 1);
    this.secrets.delete(id);
    return Promise.resolve();
  }

  findActiveForEvent(event: WebhookEvent): Promise<Webhook[]> {
    return Promise.resolve(this.webhooks.filter((w) => w.active && w.events.includes(event)));
  }

  findSecret(id: string): Promise<string | null> {
    return Promise.resolve(this.secrets.get(id) ?? null);
  }

  enqueue(drafts: DeliveryDraft[]): Promise<void> {
    const now = new Date();
    for (const draft of drafts) {
      this.deliveries.push({
        id: randomUUID(),
        webhookId: draft.webhookId,
        eventId: draft.eventId,
        eventType: draft.eventType,
        payload: draft.payload,
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        lastError: null,
        deliveredAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    return Promise.resolve();
  }

  claimDue(limit: number, leaseMs: number): Promise<WebhookDelivery[]> {
    const now = Date.now();
    const due = this.deliveries
      .filter((d) => d.status === "pending" && d.nextAttemptAt.getTime() <= now)
      .sort((a, b) => a.nextAttemptAt.getTime() - b.nextAttemptAt.getTime())
      .slice(0, limit);
    for (const delivery of due) {
      delivery.attempts += 1;
      delivery.nextAttemptAt = new Date(now + leaseMs);
    }
    return Promise.resolve(due.map((d) => ({ ...d })));
  }

  private find(id: string): WebhookDelivery | undefined {
    return this.deliveries.find((d) => d.id === id);
  }

  markDelivered(id: string): Promise<void> {
    const delivery = this.find(id);
    if (delivery) {
      delivery.status = "delivered";
      delivery.deliveredAt = new Date();
      delivery.lastError = null;
    }
    return Promise.resolve();
  }

  markRetry(id: string, nextAttemptAt: Date, error: string): Promise<void> {
    const delivery = this.find(id);
    if (delivery) {
      delivery.status = "pending";
      delivery.nextAttemptAt = nextAttemptAt;
      delivery.lastError = error;
    }
    return Promise.resolve();
  }

  markFailed(id: string, error: string): Promise<void> {
    const delivery = this.find(id);
    if (delivery) {
      delivery.status = "failed";
      delivery.lastError = error;
    }
    return Promise.resolve();
  }

  listDeliveries(webhookId: string, limit: number): Promise<WebhookDelivery[]> {
    return Promise.resolve(
      this.deliveries
        .filter((d) => d.webhookId === webhookId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit),
    );
  }
}
