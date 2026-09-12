import { createHmac } from "node:crypto";

export const SIGNATURE_HEADER = "X-Drawhaus-Signature";
export const EVENT_HEADER = "X-Drawhaus-Event";
export const EVENT_ID_HEADER = "X-Drawhaus-Event-Id";
export const DELIVERY_HEADER = "X-Drawhaus-Delivery";

/** Binding the timestamp into the signed string is what makes a captured body non-replayable. */
export function signWebhookBody(body: string, secret: string, timestampSeconds: number): string {
  const digest = createHmac("sha256", secret).update(`${timestampSeconds}.${body}`).digest("hex");
  return `t=${timestampSeconds},v1=${digest}`;
}
