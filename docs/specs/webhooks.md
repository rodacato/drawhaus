# Webhooks

> Notify external systems on diagram events with signed payloads and retry logic.

## Why

Enables CI/CD pipelines (auto-rebuild docs on diagram change), Slack notifications, audit trails in external systems — without Drawhaus needing to integrate with each service directly.

## Events

`diagram.created`, `diagram.updated`, `diagram.deleted`, `diagram.shared`, `template.created`

## Architecture

- Admin configures webhook URLs with optional secret for HMAC signing
- Fire-and-forget with retry queue: 3 attempts, exponential backoff
- HMAC-SHA256 signing with per-webhook secret so receivers can verify authenticity
- Dead letter / failure log so admins can debug broken webhooks
- Don't block the main flow — event emission points already exist in use cases

## Open Questions

- Admin-only config or allow workspace-level webhook registration?

## Panel Notes

- Rafa: fire-and-forget with retry queue. Don't block the main flow.
- Nadia: HMAC-SHA256 signing with per-webhook secret
- Iris: needs a dead letter / failure log for debugging
- Maya: low effort, high extensibility — good infrastructure investment
