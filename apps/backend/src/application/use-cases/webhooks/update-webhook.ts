import type { WebhookRepository } from "../../../domain/ports/webhook-repository";
import type { Webhook, WebhookEvent } from "../../../domain/entities/webhook";
import {
  checkWebhookUrl,
  webhookUrlRejectionMessage,
} from "../../../domain/policies/webhook-url-policy";
import { InvalidInputError, NotFoundError } from "../../../domain/errors";

export type UpdateWebhookInput = {
  url?: string;
  description?: string;
  events?: WebhookEvent[];
  active?: boolean;
};

export class UpdateWebhookUseCase {
  constructor(private readonly webhooks: WebhookRepository) {}

  async execute(id: string, input: UpdateWebhookInput): Promise<Webhook> {
    if (input.url !== undefined) {
      const rejection = checkWebhookUrl(input.url);
      if (rejection) throw new InvalidInputError(webhookUrlRejectionMessage(rejection));
    }

    const webhook = await this.webhooks.update(id, input);
    if (!webhook) throw new NotFoundError("Webhook");
    return webhook;
  }
}
