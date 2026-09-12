import type { WebhookRepository } from "../../domain/ports/webhook-repository";
import type { WebhookDelivery } from "../../domain/entities/webhook";
import { webhookAttemptsExhausted, webhookRetryDelayMs } from "../../domain/entities/webhook";
import type { WebhookSender } from "./webhook-sender";
import { logger } from "../logger";

export const DELIVERY_BATCH_SIZE = 20;
/** Long enough for the slowest request plus the write that follows it. */
export const DELIVERY_LEASE_MS = 60_000;

const ERROR_MAX_LENGTH = 500;

export class WebhookDeliveryService {
  constructor(
    private readonly webhooks: WebhookRepository,
    private readonly sender: WebhookSender,
    private readonly batchSize = DELIVERY_BATCH_SIZE,
    private readonly leaseMs = DELIVERY_LEASE_MS,
  ) {}

  async drain(): Promise<number> {
    const claimed = await this.webhooks.claimDue(this.batchSize, this.leaseMs);
    await Promise.all(claimed.map((delivery) => this.deliver(delivery)));
    return claimed.length;
  }

  private async deliver(delivery: WebhookDelivery): Promise<void> {
    const webhook = await this.webhooks.findById(delivery.webhookId);
    const secret = webhook ? await this.webhooks.findSecret(delivery.webhookId) : null;
    if (!webhook || secret === null) {
      await this.webhooks.markFailed(delivery.id, "Webhook no longer exists");
      return;
    }

    const result = await this.sender.send({
      url: webhook.url,
      secret,
      body: JSON.stringify(delivery.payload),
      eventType: delivery.eventType,
      eventId: delivery.eventId,
      deliveryId: delivery.id,
    });

    if (result.ok) {
      await this.webhooks.markDelivered(delivery.id);
      return;
    }

    const error = result.error.slice(0, ERROR_MAX_LENGTH);
    if (webhookAttemptsExhausted(delivery.attempts)) {
      logger.warn(
        { webhookId: webhook.id, deliveryId: delivery.id, attempts: delivery.attempts, error },
        "Webhook delivery dead-lettered",
      );
      await this.webhooks.markFailed(delivery.id, error);
      return;
    }

    const nextAttemptAt = new Date(Date.now() + webhookRetryDelayMs(delivery.attempts));
    await this.webhooks.markRetry(delivery.id, nextAttemptAt, error);
  }
}
