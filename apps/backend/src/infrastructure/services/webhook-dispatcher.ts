import { randomUUID } from "node:crypto";
import type { WebhookDispatcher, WebhookEmission } from "../../domain/ports/webhook-dispatcher";
import type { WebhookRepository } from "../../domain/ports/webhook-repository";
import { logger } from "../logger";

export class OutboxWebhookDispatcher implements WebhookDispatcher {
  constructor(private readonly webhooks: WebhookRepository) {}

  dispatch(emission: WebhookEmission): void {
    void this.enqueue(emission).catch((err: unknown) => {
      logger.warn({ err, event: emission.event }, "Failed to enqueue webhook delivery");
    });
  }

  async enqueue(emission: WebhookEmission): Promise<void> {
    const subscribers = await this.webhooks.findActiveForEvent(emission.event);
    if (subscribers.length === 0) return;

    const eventId = randomUUID();
    const payload = {
      id: eventId,
      event: emission.event,
      createdAt: new Date().toISOString(),
      actorId: emission.actorId,
      data: emission.data,
    };
    await this.webhooks.enqueue(
      subscribers.map((webhook) => ({
        webhookId: webhook.id,
        eventId,
        eventType: emission.event,
        payload,
      })),
    );
  }
}
