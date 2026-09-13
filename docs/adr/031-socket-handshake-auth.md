# ADR-031: Socket Handshake Admits a Credential, Joins Still Authorize the Room

**Status:** accepted
**Date:** 2026-09-12
**Refines:** ADR-007 (socket protocol design), ADR-028 (save acknowledgement)
**Refined by:** ADR-032 (closing sockets on revoke)

## Context

The Socket.IO server had no `io.use`. Any client that could reach `/socket.io/` got a connected
socket, and `docs/ARCHITECTURE.md` drew a "Socket Auth Middleware" box that did not exist. #157
closed the worst of it inside the handlers: every payload is validated and every room event checks
that the socket joined the room. A socket that joined nothing can do nothing, but it can still be
opened by anyone, hold a connection, and send frames into the handlers.

The credentials already existed, just not at connect time:

- A signed-in board sends the `drawhaus_session` cookie on the upgrade request. `join-room` parsed
  it from `socket.handshake.headers` and resolved the session per join.
- A share-link guest has no cookie. Its share token reached the server only after connecting, in
  the `join-room-guest` payload.

## Decision

**A Socket.IO middleware refuses any connection that presents neither a valid session cookie nor a
valid share token. It admits; it does not authorize.**

- `AuthenticateSocketUseCase` (application layer) takes the session token and the share token and
  answers `"session"`, `"share-link"` or `null`. A session counts when it exists, has not expired,
  and belongs to a user who is not disabled, the same rule as `require-auth`. A share token counts
  when the link exists and has not expired. The session is tried first, and a stale cookie falls
  through to the share token, so a guest with an old cookie in the browser is not refused.
- `infrastructure/socket/handshake-auth.ts` reads the cookie from the handshake headers and the
  share token from Socket.IO's `auth` payload (`{ shareToken }`, Zod-validated, anything else is
  ignored), and calls `next()` or `next(error)`. It is registered in `setupSocketServer` before
  `connection`.
- The client sends `auth: { shareToken }` when it joins as a guest and no `auth` when signed in.
  `socket.io-client` resends it on every reconnect.

### What the handshake establishes, and what each event still checks

Only that the connection presented a credential that was valid at that moment. Apart from the
access rooms ADR-032 added, which record which credential admitted the socket, it stores nothing
on the socket. Identity (`userId`, `isGuest`) and the per-room role are still set by `join-room`
and `join-room-guest`, which resolve the credential again, and every room event keeps the #157
membership and `canEdit` checks. The handshake is a gate in front of those checks, not a
replacement. Resolving twice costs one extra session or share lookup per connection. In return
there is one source of truth for room authorization, and a session that expires between connect
and join is still caught at the join.

### A session or link that ends while the socket is open

This ADR left it out of scope. Every reconnect runs the handshake again, so a socket whose
credential has ended cannot come back after a network blip, a deploy or a server restart. An open
socket, though, kept its rooms until it disconnected.

[ADR-032](032-close-sockets-on-revoke.md) closes that gap for the paths that end a credential with
a write. Logout, password reset, an admin disabling or deleting a user, account deletion and
share-link revoke now close the sockets that credential admitted, through the `RealtimeNotifier`
port. Expiry has no write to hook into, so a session or link that expires still keeps its open
socket until the next reconnect, which is refused.

### How a share-token socket is scoped

It gains nothing it could not do before. `join-room` still requires a session cookie and the
caller's access to that diagram, so a socket admitted with a link for diagram A that sends
`join-room` for diagram B gets `room-error`. `join-room-guest` still validates the token in its own
payload. A socket admitted with token A can therefore join B only with a valid token for B, which a
fresh connection holding that token could do anyway. Binding guest joins to the handshake token was
considered and rejected: a token is already a bearer capability, and the binding would add a rule
without removing any access.

### What a refused handshake looks like

The client receives `connect_error` with `message: "Not authorized to connect. Reload the page."`
and `data: { reason }`:

| `reason`          | When                                                            |
| ----------------- | --------------------------------------------------------------- |
| `unauthenticated` | No valid session cookie and no valid share token                |
| `server-error`    | The credential lookup threw (database down); logged as an error |

A middleware refusal makes `socket.io-client` destroy the socket (`socket.active === false`), and
it does not reconnect on its own, so a refused client does not spin; a backend test asserts that
exactly one handshake reaches the server. The client uses `socket.active` to tell a refusal from a
transport failure it is still retrying, and shows es-MX copy for the refusal: the session ended, the
link is no longer valid, or access could not be verified. It does not reconnect by itself; a reload
does.

`server-error` is also terminal on the client. Retrying a refused socket needs a manual
`socket.connect()`, and a database outage already surfaces as `room-error` on join today, so this
keeps that behaviour rather than adding a retry loop.

### Deploy window

A deploy restarts the backend, and every open tab reconnects through the new handshake.

- **A signed-in tab from before the deploy is unaffected.** Its credential is the cookie, which the
  browser sends on the upgrade whatever version of the bundle is running.
- **A guest tab from before the deploy is refused.** Its bundle does not send `auth`, and it has
  no cookie. Its connection badge shows the refusal message verbatim, which is why the message
  says to reload. Reloading fetches the new bundle, which sends the token. Guest edits made
  between the disconnect and the reload do not reach the server: guests cannot use the REST save
  fallback.

**Decided 2026-09-12: refuse from the first deploy.** The rejected alternative was a grace release that
admits a handshake with no credential for one deploy and removes that path in the next. It keeps
old guest tabs alive, but for that whole release it admits exactly the anonymous sockets this
change exists to refuse, since the server cannot tell an old guest tab from any other client with
no credential, and it needs a second deploy to finish. Drawhaus is a personal tool (ADR-001), a guest tab open across a deploy is rare, and
it recovers with a reload.

## Alternatives Considered

- **Resolve the identity at the handshake and have the join handlers trust it.** It saves a lookup,
  but it moves room authorization into two places, and a join would stop noticing a session that
  expired after connecting.
- **Send the share token as a query parameter.** Query strings end up in proxy and access logs.
  The `auth` payload travels inside the Socket.IO CONNECT packet, over any transport.
- **Revalidate the session on every event.** A database round trip per cursor move to cover a
  window that a reconnect already closes.

## Consequences

- No anonymous socket reaches a handler. Opening a connection needs a live session or a valid share
  link.
- `docs/ARCHITECTURE.md`'s socket auth box now describes code that exists.
- Revoking a link or logging out disconnects a board that is already open, and so do a password
  reset, disabling a user and deleting a user (ADR-032). An expired session or link is not
  disconnected, and its next reconnect is refused.
- Old guest tabs are refused on the deploy that ships this (see "Deploy window").
