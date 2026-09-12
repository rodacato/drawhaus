import crypto from "node:crypto";

export const WEBHOOK_SECRET_PREFIX = "whsec_";

export function generateWebhookSecret(): string {
  return WEBHOOK_SECRET_PREFIX + crypto.randomBytes(32).toString("hex");
}
