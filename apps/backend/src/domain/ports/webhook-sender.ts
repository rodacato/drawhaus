export type WebhookRequest = {
  url: string;
  secret: string;
  body: string;
  eventType: string;
  eventId: string;
  deliveryId: string;
};

export type WebhookResult = { ok: true; status: number } | { ok: false; error: string };

export interface WebhookSender {
  send(request: WebhookRequest): Promise<WebhookResult>;
}
