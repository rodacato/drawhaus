import type { WebhookRepository } from "../../../domain/ports/webhook-repository";
import type { WebhookDelivery } from "../../../domain/entities/webhook";
import { NotFoundError } from "../../../domain/errors";

export const DELIVERY_LOG_LIMIT = 50;

export class ListWebhookDeliveriesUseCase {
  constructor(private readonly webhooks: WebhookRepository) {}

  async execute(webhookId: string, limit = DELIVERY_LOG_LIMIT): Promise<WebhookDelivery[]> {
    const webhook = await this.webhooks.findById(webhookId);
    if (!webhook) throw new NotFoundError("Webhook");
    return this.webhooks.listDeliveries(webhookId, limit);
  }
}
