import type { WebhookRepository } from "../../../domain/ports/webhook-repository";
import type { Webhook } from "../../../domain/entities/webhook";
import { NotFoundError } from "../../../domain/errors";
import { generateWebhookSecret } from "./webhook-secret";

export class RegenerateWebhookSecretUseCase {
  constructor(private readonly webhooks: WebhookRepository) {}

  async execute(id: string): Promise<{ webhook: Webhook; secret: string }> {
    const secret = generateWebhookSecret();
    const webhook = await this.webhooks.update(id, { secret });
    if (!webhook) throw new NotFoundError("Webhook");
    return { webhook, secret };
  }
}
