import type { Webhook, WebhookDelivery, WebhookEvent, WebhookPayload } from "../entities/webhook";

export type WebhookDraft = {
  url: string;
  secret: string;
  description?: string;
  events: WebhookEvent[];
  active?: boolean;
};

export type WebhookPatch = {
  url?: string;
  secret?: string;
  description?: string;
  events?: WebhookEvent[];
  active?: boolean;
};

export type DeliveryDraft = {
  webhookId: string;
  eventId: string;
  eventType: WebhookEvent;
  payload: WebhookPayload;
};

export interface WebhookRepository {
  create(draft: WebhookDraft): Promise<Webhook>;
  findById(id: string): Promise<Webhook | null>;
  list(): Promise<Webhook[]>;
  update(id: string, patch: WebhookPatch): Promise<Webhook | null>;
  delete(id: string): Promise<void>;
  findActiveForEvent(event: WebhookEvent): Promise<Webhook[]>;
  /** Decrypted; only the delivery path needs it, and it never leaves the process. */
  findSecret(id: string): Promise<string | null>;

  enqueue(drafts: DeliveryDraft[]): Promise<void>;
  /**
   * Takes up to `limit` due rows for this process alone, counting the attempt and holding them
   * for `leaseMs` so a crash mid-delivery releases them instead of stranding them.
   */
  claimDue(limit: number, leaseMs: number): Promise<WebhookDelivery[]>;
  markDelivered(id: string): Promise<void>;
  markRetry(id: string, nextAttemptAt: Date, error: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  listDeliveries(webhookId: string, limit: number): Promise<WebhookDelivery[]>;
}
