const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export type WebhookUrlRejection = "malformed" | "protocol" | "credentials";

/**
 * Private and link-local hosts are deliberately allowed: a self-hosted instance's whole point is
 * calling an endpoint on its own network (ADR-029 records what that leaves undefended).
 */
export function checkWebhookUrl(raw: string): WebhookUrlRejection | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "malformed";
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return "protocol";
  if (url.username !== "" || url.password !== "") return "credentials";
  return null;
}

export function isDeliverableWebhookUrl(raw: string): boolean {
  return checkWebhookUrl(raw) === null;
}

const REJECTION_MESSAGES: Record<WebhookUrlRejection, string> = {
  malformed: "Webhook URL is not a valid URL",
  protocol: "Webhook URL must use http or https",
  credentials: "Webhook URL must not embed credentials",
};

export function webhookUrlRejectionMessage(rejection: WebhookUrlRejection): string {
  return REJECTION_MESSAGES[rejection];
}
