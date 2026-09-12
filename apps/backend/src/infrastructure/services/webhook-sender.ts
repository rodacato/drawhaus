import { checkWebhookUrl } from "../../domain/policies/webhook-url-policy";
import {
  DELIVERY_HEADER,
  EVENT_HEADER,
  EVENT_ID_HEADER,
  SIGNATURE_HEADER,
  signWebhookBody,
} from "./webhook-signature";
import type {
  WebhookRequest,
  WebhookResult,
  WebhookSender,
} from "../../domain/ports/webhook-sender";
import { config } from "../config";

export const WEBHOOK_TIMEOUT_MS = 10_000;

export class FetchWebhookSender implements WebhookSender {
  constructor(private readonly timeoutMs = WEBHOOK_TIMEOUT_MS) {}

  async send(request: WebhookRequest): Promise<WebhookResult> {
    const rejection = checkWebhookUrl(request.url);
    if (rejection) return { ok: false, error: `Rejected URL (${rejection})` };

    const timestamp = Math.floor(Date.now() / 1000);
    try {
      const response = await fetch(request.url, {
        method: "POST",
        // Manual: following one would let a registered public URL bounce the request at a host
        // the policy would have judged for itself.
        redirect: "manual",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          "content-type": "application/json",
          "user-agent": `Drawhaus-Webhook/${config.appVersion}`,
          [EVENT_HEADER]: request.eventType,
          [EVENT_ID_HEADER]: request.eventId,
          [DELIVERY_HEADER]: request.deliveryId,
          [SIGNATURE_HEADER]: signWebhookBody(request.body, request.secret, timestamp),
        },
        body: request.body,
      });
      // Discarded unread: the delivery log is admin-readable, and echoing a response into it
      // would turn a webhook into a way to read whatever the instance can reach.
      void response.body?.cancel().catch(() => null);
      if (response.status >= 200 && response.status < 300) {
        return { ok: true, status: response.status };
      }
      return { ok: false, error: `HTTP ${response.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
    }
  }
}
