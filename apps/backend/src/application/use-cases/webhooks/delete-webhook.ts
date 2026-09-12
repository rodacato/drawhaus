import type { WebhookRepository } from "../../../domain/ports/webhook-repository";
import { NotFoundError } from "../../../domain/errors";

export class DeleteWebhookUseCase {
  constructor(private readonly webhooks: WebhookRepository) {}

  async execute(id: string): Promise<void> {
    const webhook = await this.webhooks.findById(id);
    if (!webhook) throw new NotFoundError("Webhook");
    await this.webhooks.delete(id);
  }
}
