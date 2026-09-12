import type { WebhookRepository } from "../../../domain/ports/webhook-repository";
import type { Webhook, WebhookEvent } from "../../../domain/entities/webhook";
import {
  checkWebhookUrl,
  webhookUrlRejectionMessage,
} from "../../../domain/policies/webhook-url-policy";
import { InvalidInputError } from "../../../domain/errors";
import { generateWebhookSecret } from "./webhook-secret";

export type CreateWebhookInput = {
  url: string;
  description?: string;
  events: WebhookEvent[];
  active?: boolean;
};

export class CreateWebhookUseCase {
  constructor(private readonly webhooks: WebhookRepository) {}

  async execute(input: CreateWebhookInput): Promise<{ webhook: Webhook; secret: string }> {
    const rejection = checkWebhookUrl(input.url);
    if (rejection) throw new InvalidInputError(webhookUrlRejectionMessage(rejection));

    const secret = generateWebhookSecret();
    const webhook = await this.webhooks.create({
      url: input.url,
      description: input.description,
      events: input.events,
      active: input.active,
      secret,
    });
    return { webhook, secret };
  }
}
