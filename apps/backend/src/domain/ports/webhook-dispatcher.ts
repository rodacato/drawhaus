import type { WebhookEvent } from "../entities/webhook";

export type WebhookEmission = {
  event: WebhookEvent;
  actorId: string | null;
  data: Record<string, unknown>;
};

/**
 * Fire-and-forget, like AuditLogger: the write has already committed, so a subscriber that is
 * unreachable — or a dispatcher that throws — must never reach the caller.
 */
export interface WebhookDispatcher {
  dispatch(emission: WebhookEmission): void;
}
