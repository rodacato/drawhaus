import type {
  WebhookRequest,
  WebhookResult,
  WebhookSender,
} from "../../domain/ports/webhook-sender";

export class FakeWebhookSender implements WebhookSender {
  readonly requests: WebhookRequest[] = [];
  result: WebhookResult = { ok: true, status: 200 };

  send(request: WebhookRequest): Promise<WebhookResult> {
    this.requests.push(request);
    return Promise.resolve(this.result);
  }
}
