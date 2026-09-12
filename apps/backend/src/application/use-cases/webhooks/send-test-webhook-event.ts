import crypto from "node:crypto";
import type { WebhookRepository } from "../../../domain/ports/webhook-repository";
import type { WebhookResult, WebhookSender } from "../../../domain/ports/webhook-sender";
import { WEBHOOK_TEST_EVENT } from "../../../domain/entities/webhook";
import { NotFoundError } from "../../../domain/errors";

export class SendTestWebhookEventUseCase {
  constructor(
    private readonly webhooks: WebhookRepository,
    private readonly sender: WebhookSender,
  ) {}

  async execute(id: string, actorId: string): Promise<WebhookResult> {
    const webhook = await this.webhooks.findById(id);
    const secret = webhook ? await this.webhooks.findSecret(id) : null;
    if (!webhook || secret === null) throw new NotFoundError("Webhook");

    const eventId = crypto.randomUUID();
    const body = JSON.stringify({
      id: eventId,
      event: WEBHOOK_TEST_EVENT,
      createdAt: new Date().toISOString(),
      actorId,
      data: { webhookId: webhook.id },
    });

    return this.sender.send({
      url: webhook.url,
      secret,
      body,
      eventType: WEBHOOK_TEST_EVENT,
      eventId,
      deliveryId: eventId,
    });
  }
}
