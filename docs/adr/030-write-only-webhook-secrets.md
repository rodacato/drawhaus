# ADR-030: Webhook Secrets Are Write-Only, and the Test Event Bypasses the Outbox

**Status:** accepted
**Date:** 2026-09-12
**Refines:** ADR-029 (webhooks delivered from a Postgres outbox)

## Context

ADR-029 shipped the delivery half of webhooks and closed with a consequence that is no longer
true: _"No new HTTP endpoints. Registration, listing and the dead-letter view are a separate
change; until they exist a webhook can only be created through the repository."_ This is that
change, and it raises two questions ADR-029 did not have to answer.

The first is what the admin API does with the signing secret. ADR-029 chose encryption over
hashing because delivery needs the plaintext to sign a body; nothing in it says whether the API
may hand that plaintext back. Encryption makes it technically possible, which is exactly why the
choice has to be deliberate rather than inherited from the storage decision.

The second is how an admin debugs a receiver that does not work. The outbox answers "what did we
send and what came back" minutes after an event happened. The question an admin actually asks —
_is this URL reachable and does my signature check pass?_ — has no answer until something in the
product happens to fire an event they can watch for.

## Decision

**The secret is returned exactly twice in its life: at creation and at regeneration. Every read
path omits it.**

- `POST /api/admin/webhooks` generates the secret server-side — `whsec_` plus 32 random bytes in
  hex — and returns it in the create response. The admin does not choose it, so a weak secret
  cannot be registered.
- `infrastructure/serializers/webhook.ts` is the only shape a webhook takes on the wire, and it
  whitelists seven fields. `PgWebhookRepository` already never selects the encrypted columns, so
  the serializer is a second, explicit barrier rather than the only one.
- `POST /api/admin/webhooks/:id/secret` regenerates: a new plaintext once, the old one dead
  immediately. This is the recovery path for a lost secret, and it is the only one — there is no
  reveal.
- `PATCH` accepts `url`, `description`, `events` and `active` and nothing else. A `secret` field in
  the body is stripped by the Zod schema rather than reaching `WebhookPatch.secret`, which the
  repository would have happily encrypted.

**`POST /api/admin/webhooks/:id/test` sends synchronously through `WebhookSender` and does not
touch the outbox.** It signs a `webhook.test` event with the stored secret, waits for the
receiver, and returns `{ ok, status }` or `{ ok, error }` to the admin who clicked. A failure is a
200 carrying the receiver's answer, not a 5xx: the action succeeded, the receiver is what failed.

**When `ENCRYPTION_KEY` is unset the surface degrades instead of disappearing.** `GET
/api/admin/webhooks` answers 200 with `encryptionEnabled: false` and the event list, and the panel
renders why webhooks are unavailable — the same shape `/api/admin/integrations` already uses. The
mutating endpoints answer 400 naming the missing key.

## Alternatives Considered

- **A reveal endpoint, or masking like Integration Secrets.** Integration Secrets masks because an
  admin needs to recognise a value they set elsewhere. Nobody sets a webhook secret elsewhere: it
  is generated here and copied into a receiver once. A reveal endpoint would add a way to
  exfiltrate every signing key to a surface whose only gain is saving a regeneration.
- **Hashing the secret instead.** Not available — HMAC signing needs the plaintext at delivery
  time. That is the trade ADR-029 already made; this ADR is what keeps the cost of it contained.
- **Letting the admin supply the secret.** Invites a weak or reused one, and buys nothing: the
  receiver has to be told the value either way.
- **Routing the test event through the outbox.** It would inherit signing, retries and a delivery
  record for free, and lose the only thing that makes the action worth having — an answer while
  the admin is still looking at the screen. It would also put `webhook.test` rows in the log that
  every subsequent read has to explain.
- **A separate `webhook.test` subscribable event.** Rejected: nothing should be able to subscribe
  to an event that only an admin button can emit, so the constant lives outside `WEBHOOK_EVENTS`.

## Consequences

- **A lost secret costs a regeneration and a receiver update.** This is the intended cost and the
  admin is told it before confirming.
- **Widening the serializer is how this ADR gets broken**, so the route test asserts the exact key
  set of a webhook response rather than the absence of one field. A new field added to
  `formatWebhook` fails that test whatever it is called.
- **The test event's delivery is not recorded.** An admin who sends one and then opens the
  delivery log will not find it. The result toast is the record, and it is immediate.
- **The test event bypasses the URL policy's second gate only in appearance.** `FetchWebhookSender`
  re-checks the URL itself, so a webhook registered before a policy change is still refused at
  send time, exactly as scheduled delivery would refuse it.
- **A `webhook.test` payload reaches receivers that only subscribed to diagram events.** It is
  signed identically and carries the same envelope, so a receiver that validates by signature and
  switches on `event` will ignore it. Receivers that assume the event is always a diagram event
  will see an unknown one.
