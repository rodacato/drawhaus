# ADR-029: Webhooks Delivered From a Postgres Outbox

**Status:** accepted
**Date:** 2026-09-12
**Refines:** ADR-021 (Redis as optional shared state), ADR-027 (no event bus)

## Context

External systems want to react to diagram lifecycle events — rebuild docs when a diagram changes,
post to Slack when one is shared, mirror template creation into an internal catalogue. Doing that
without Drawhaus integrating with each service means signed HTTP callbacks to an admin-registered
URL.

The delivery half is the hard part. A webhook receiver is by definition something we do not
control: it is slow, it is down, it answers 500, it never answers at all. None of that may reach
the user whose write triggered the event, and a failed attempt has to survive long enough to be
retried and, when it never succeeds, to be read back by whoever has to debug it.

`docs/specs/webhooks.md` proposed building on the `RealtimeNotifier` port and claimed the emission
points already existed. Neither holds. That port (ADR-027) exists to tell open boards their scene
was replaced; its events are scene-, snapshot- and comment-shaped and carry a revision, and none of
that has anything to do with entity lifecycle. And of the five emission points, zero existed:
`CreateDiagramUseCase` and `DeleteDiagramUseCase` had no hook of any kind, and only the
ownership-transfer use cases carried an `AuditLogger`.

## Decision

**Events are queued into a Postgres outbox table and delivered by a poller, not sent inline.**

- `domain/ports/webhook-dispatcher.ts` declares one fire-and-forget method, `dispatch`, shaped
  after `AuditLogger.log` rather than after `RealtimeNotifier`. The use case calls it after its
  write has committed and never awaits it. The adapter swallows and logs every error, so a
  subscriber that is down cannot fail, slow or roll back the user's request.
- `OutboxWebhookDispatcher` resolves the active webhooks subscribed to the event and inserts one
  `webhook_deliveries` row per subscriber, all sharing one `event_id` so a receiver watching
  several endpoints can deduplicate.
- `WebhookDeliveryService` drains the outbox on a 10-second `node-cron` schedule, following the
  start/stop shape of `backup-scheduler.ts`. It claims rows with
  `SELECT … FOR UPDATE SKIP LOCKED`, which is what makes the open "does production run more than
  one backend instance?" question moot here: two instances cannot claim the same row.
- **A claim is a lease, not a status change.** Claiming increments `attempts` and pushes
  `next_attempt_at` out by 60s while leaving the row `pending`. A process that dies mid-delivery
  therefore releases its work automatically after the lease instead of stranding a row in a
  `delivering` state nothing ever clears. The cost is that a crash can cost an attempt, which is
  the right trade: the alternative strands deliveries forever.
- **3 attempts, then dead letter.** Backoff is 30s then 120s (base 30s, factor 4). The fourth
  outcome is `status = 'failed'` with `last_error` — the same table is the dead-letter log the
  spec asked for, so there is no second store to build or reconcile.
- **HMAC-SHA256 over the raw body, keyed by a per-webhook secret**, in
  `X-Drawhaus-Signature: t=<unix seconds>,v1=<hex digest>`, signing `${t}.${body}` in Stripe's
  shape rather than GitHub's bare `sha256=<digest>`. Binding the timestamp is what makes a
  captured body non-replayable, and it costs the receiver one extra line. Secrets are stored with
  the existing `infrastructure/services/encryption.ts` (AES-256-GCM, `ENCRYPTION_KEY`), the same
  way `pg-integration-secrets-repository.ts` stores integration secrets. Without that key the
  repository is not constructed and the whole feature is off, exactly as integration secrets
  already behave.
- **Registration is admin-only and carries no `workspace_id`.** Config belongs with the admin
  surface, alongside Integration Secrets. Workspace-scoped registration stays possible as a purely
  additive migration (a nullable column plus one predicate in `findActiveForEvent`) and is not
  built.

**`diagram.updated` fires on API/MCP writes only.** The only emission point is
`UpdateDiagramUseCase`, which serves `PATCH /api/diagrams/:id` and `PATCH /v1/diagrams/:id`.
Realtime canvas saves go through the socket `save-scene` path and emit nothing. This is
deliberate, not an oversight: a board edited all day through the canvas produces no webhook
traffic at all, because an element-level save every few seconds is not an event any external system
can act on. Do not "fix" it by adding a dispatcher to `SaveSceneUseCase` — that turns a webhook
into a firehose.

**Payloads carry metadata, never content.** A scene's elements run to megabytes and no subscriber
asked for them. `diagram.shared` deliberately omits the share link's token: the token _is_ the
capability to open the diagram, and a webhook payload is the wrong place to hand one out. A
subscriber learns that a link was created, its role and its expiry.

## Alternatives Considered

- **Redis-backed queue (BullMQ or a plain list).** Rejected: `REDIS_URL` is optional (ADR-021) and
  an instance without it would silently have no retry at all. A feature whose durability depends on
  an optional dependency is a feature that half-works on most self-hosted installs.
- **In-memory queue with `setTimeout` retries.** Cheapest, and loses every pending delivery on
  deploy — which, for a system that retries over minutes, is most of them. It also double-delivers
  the moment a second instance exists.
- **Inline `await fetch` at the emission point.** Puts an untrusted third party's latency inside
  the user's request and its failures inside the user's transaction. This is the failure the spec's
  "don't block the main flow" note is about.
- **Extending `RealtimeNotifier`.** Rejected on the evidence above: different audience (a browser
  in a room vs. an external server), different payloads, different delivery guarantees.
- **An event bus.** ADR-027 rejected one and predicted webhooks would be the second consumer that
  justifies it. It still does not: there is one publisher shape and two independent subscribers
  that share no payload, so a bus would buy an event registry and an async hop while losing the
  compile-time check a port gives. Explicit `dispatch` calls at five sites, the way `AuditLogger`
  is already injected, remain cheaper to read than an indirection.
- **A dedicated dead-letter table.** The outbox row already holds every field a dead letter needs;
  a second table would only add a copy to keep in step.

## Consequences

- **Enqueue is not transactional with the write.** The use case commits, then the dispatcher
  inserts the outbox row in a separate statement. If the process dies in between, the event is
  lost — at-most-once with respect to the write. A true transactional outbox needs the write's
  `PoolClient` threaded through the use case into the dispatcher, and no repository in this
  codebase takes a client. That is a deliberate deferral, not an oversight.
- **Delivery is at-least-once.** The lease can expire while a request is still in flight, and a
  receiver that answers slowly may be called twice. The shared `event_id` is there so receivers
  can deduplicate; the docs say so.
- **The SSRF surface is real and only partly closed.** Non-`http(s)` schemes and URLs carrying
  credentials are refused, redirects are never followed (`redirect: "manual"` — following one lets
  a public URL bounce the request at a host the policy already judged), every request has a 10s
  timeout, and the response body is discarded unread so the admin-readable delivery log can never
  become a channel for reading whatever the instance can reach. **Not defended:** private,
  loopback and link-local addresses are allowed, and DNS rebinding is not prevented. Blocking them
  would break the feature's main use — a self-hosted instance calling a service on its own network
  — and the registrant is an instance admin who already controls the deploy. An instance that
  hands webhook registration to a less-trusted role must revisit this.
- **Deliveries accumulate.** Nothing prunes `webhook_deliveries` yet. A busy instance will want a
  retention job; the `webhook_deliveries_webhook_id_idx` index is shaped for the read side of one.
- Five use cases gained an optional `WebhookDispatcher` constructor argument. Omitting it — which
  every existing test does — is a no-op, so the feature is off wherever it is not wired.
- No new HTTP endpoints. Registration, listing and the dead-letter view are a separate change;
  until they exist a webhook can only be created through the repository.
