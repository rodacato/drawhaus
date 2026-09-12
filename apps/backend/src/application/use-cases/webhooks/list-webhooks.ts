import type { WebhookRepository } from "../../../domain/ports/webhook-repository";
import type { Webhook } from "../../../domain/entities/webhook";

export class ListWebhooksUseCase {
  constructor(private readonly webhooks: WebhookRepository) {}

  execute(): Promise<Webhook[]> {
    return this.webhooks.list();
  }
}
