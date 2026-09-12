import type { Webhook, WebhookDelivery } from "../../domain/entities/webhook";

/** The secret is write-only: returned once at creation and regeneration, never from here. */
export function formatWebhook(webhook: Webhook) {
  return {
    id: webhook.id,
    url: webhook.url,
    description: webhook.description,
    events: webhook.events,
    active: webhook.active,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
  };
}

export function formatWebhookDelivery(delivery: WebhookDelivery) {
  return {
    id: delivery.id,
    eventId: delivery.eventId,
    eventType: delivery.eventType,
    payload: delivery.payload,
    status: delivery.status,
    attempts: delivery.attempts,
    lastError: delivery.lastError,
    nextAttemptAt: delivery.nextAttemptAt.toISOString(),
    deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
  };
}
