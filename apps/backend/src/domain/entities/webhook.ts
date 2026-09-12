export const WEBHOOK_EVENTS = [
  "diagram.created",
  "diagram.updated",
  "diagram.deleted",
  "diagram.shared",
  "template.created",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export type Webhook = {
  id: string;
  url: string;
  description: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** `pending` covers both "never tried" and "waiting out a backoff"; `failed` is the dead letter. */
export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

export type WebhookPayload = {
  id: string;
  event: WebhookEvent;
  createdAt: string;
  actorId: string | null;
  data: Record<string, unknown>;
};

export type WebhookDelivery = {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: WebhookEvent;
  payload: WebhookPayload;
  status: WebhookDeliveryStatus;
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const WEBHOOK_MAX_ATTEMPTS = 3;

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_FACTOR = 4;

/** Delay before the retry that follows `attempts` failed attempts: 30s, then 120s. */
export function webhookRetryDelayMs(attempts: number): number {
  return BACKOFF_BASE_MS * BACKOFF_FACTOR ** (attempts - 1);
}

export function webhookAttemptsExhausted(attempts: number): boolean {
  return attempts >= WEBHOOK_MAX_ATTEMPTS;
}
