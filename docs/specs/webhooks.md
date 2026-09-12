# Webhooks

> Notify external systems on diagram events with signed payloads and retry logic.

Shipped. Delivery machinery: [ADR-029](../adr/029-webhook-outbox.md). Admin API and UI:
[ADR-030](../adr/030-write-only-webhook-secrets.md).

## Why

Enables CI/CD pipelines (auto-rebuild docs on diagram change), Slack notifications, audit trails in external systems — without Drawhaus needing to integrate with each service directly.

## Events

`diagram.created`, `diagram.updated`, `diagram.deleted`, `diagram.shared`, `template.created`

`diagram.updated` fires on API and MCP writes only (`PATCH /api/diagrams/:id`,
`PATCH /v1/diagrams/:id`). Realtime canvas saves take the socket `save-scene` path and emit
nothing, deliberately — see ADR-029.

## Architecture

- Admin configures webhook URLs, each with a secret for HMAC signing
- Events are queued into a Postgres outbox and drained by a 10s poller claiming rows with
  `SELECT … FOR UPDATE SKIP LOCKED`; fire-and-forget from the use case's point of view
- 3 attempts, exponential backoff (30s, 120s), then the row is dead-lettered in place
- HMAC-SHA256 with the per-webhook secret in `X-Drawhaus-Signature: t=<unix>,v1=<hex>`, signing
  `${t}.${body}` so a captured body cannot be replayed
- The outbox table is the dead letter / failure log
- Don't block the main flow

### Payload

```json
{
  "id": "<event id, shared across every subscriber of one event>",
  "event": "diagram.created",
  "createdAt": "2026-09-12T00:00:00.000Z",
  "actorId": "<user id, or null>",
  "data": { "...": "metadata only; never scene elements" }
}
```

Headers: `X-Drawhaus-Event`, `X-Drawhaus-Event-Id`, `X-Drawhaus-Delivery`, `X-Drawhaus-Signature`.

The admin "send test event" action sends the same envelope with `event: "webhook.test"`. Nothing
can subscribe to it, so a receiver should switch on `event` and ignore what it does not know.

Verification, in a receiver:

```js
const [, t, v1] = /t=(\d+),v1=([0-9a-f]+)/.exec(req.headers["x-drawhaus-signature"]);
const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
const ok =
  timingSafeEqual(Buffer.from(expected), Buffer.from(v1)) &&
  Math.abs(Date.now() / 1000 - Number(t)) < 300;
```

Delivery is at-least-once: deduplicate on `id`.

## Admin Surface

Registration, the delivery log and the send-test action live behind the admin guard, beside
Integration Secrets in Site Settings. The signing secret is generated server-side and shown once,
at creation or regeneration; no read path returns it. Without `ENCRYPTION_KEY` the panel says why
webhooks are unavailable instead of rendering an empty registry.

## Resolved Questions

- **Admin-only config or workspace-level registration?** Admin-only. Config lives with the admin
  surface, beside Integration Secrets. Workspace-level registration stays possible as an additive
  migration and is not built.
- **Can an admin read a secret back?** No — encryption made it possible, ADR-030 refused it.
  Regeneration is the recovery path.

## Corrections

Two claims in the original draft were wrong and are struck:

- ~~"Build it on the `RealtimeNotifier` port."~~ That port (ADR-027) tells open boards their scene
  was replaced; its events are scene-shaped and share nothing with entity lifecycle. Webhooks use
  their own `WebhookDispatcher` port, modelled on `AuditLogger`.
- ~~"Event emission points already exist in use cases."~~ None did. `CreateDiagramUseCase` and
  `DeleteDiagramUseCase` had no hook at all; only the ownership-transfer use cases carried an
  `AuditLogger`. All five emission points were opened by this work.
- ~~"Effort: S."~~ A migration, two tables, two ports, a repository, a signer, a sender, a poller,
  a scheduler and five emission points.

## Panel Notes

- Rafa: fire-and-forget with retry queue. Don't block the main flow.
- Nadia: HMAC-SHA256 signing with per-webhook secret
- Iris: needs a dead letter / failure log for debugging
- Maya: low effort, high extensibility — good infrastructure investment
