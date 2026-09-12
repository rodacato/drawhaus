# ADR-032: Revoking a Credential Closes the Sockets It Admitted

**Status:** accepted
**Date:** 2026-09-12
**Refines:** ADR-027 (realtime notifier port), ADR-031 (socket handshake auth)

## Context

ADR-031 checks a credential when a socket connects and on every reconnect, and nowhere else. A
socket that is already open keeps its rooms until it disconnects. After a logout, a password reset,
an admin disabling or deleting the account, the user deleting their own account, or the owner
revoking a share link, the open tab keeps receiving and sending scene updates for as long as it
stays open. ADR-031 recorded this as a follow-up.

The paths that end a credential:

| Use case                 | What it ends                                      |
| ------------------------ | ------------------------------------------------- |
| `LogoutUseCase`          | One session                                       |
| `ResetPasswordUseCase`   | Every session of the user                         |
| `AdminUpdateUserUseCase` | Every session of the user, when `disabled: true`  |
| `AdminDeleteUserUseCase` | Every session of the user, then the user          |
| `DeleteAccountUseCase`   | The user row, and with it every session (cascade) |
| `DeleteLinkUseCase`      | One share link                                    |

Before this change nothing recorded which credential admitted a socket, so there was no way to find
the sockets to close.

## Decision

**Each admitted socket joins rooms named after its credential, and each of those use cases, once
the credential is gone, tells `RealtimeNotifier` to close the room.**

### The port

`RealtimeNotifier` gains `accessRevoked(event)`, where the event is
`{ kind: "session", sessionToken }`, `{ kind: "user-sessions", userId }` or
`{ kind: "share-link", shareToken }`. The adapter sends the room an `access-revoked` notice and then
calls `io.in(room).disconnectSockets(true)`.

This extends the existing port rather than adding a second one. The problems are the same ones
ADR-027 already solved: use cases are built before the `io` Server exists (`attach`), a committed
write must not fail because the socket layer did (log, never throw), and a message must cross
instances through the Redis adapter. A second port would repeat all three and add a second
`attach` in `main.ts`. The event names what happened in the domain ("this credential is gone"), and
closing the socket is the adapter's reaction, just as `sceneReplaced` becomes `scene-from-db`.

### The rooms

| Admitted by | Rooms joined at the handshake                                     |
| ----------- | ----------------------------------------------------------------- |
| Session     | `access:session:<sha256(session token)>`, `access:user:<user id>` |
| Share link  | `access:share-link:<sha256(share token)>`                         |

`join-room-guest` also joins `access:share-link:<sha256(token)>` for the token in its payload,
because a socket admitted with a cookie, or with a different link, can join a board through a
link. That membership came from the link, so revoking the link closes it.

**No token is ever a room name.** The Redis adapter sends room names to Redis: in the channel name
of a broadcast to a single room, and in the body of a disconnect request. A raw token would
therefore leave the process on every revoke and could appear in Redis logs and monitoring. SHA-256 is enough: the tokens are 32 and 24 random bytes, so there is nothing to
brute-force, and an HMAC key would be one more secret to manage without adding protection. The user
id is used as it is, since every client in a room already receives it in `room-joined` and
`room-presence`.

The names contain `:`, so the `disconnecting` handler, which skips scene sub-rooms by that
character, does not treat them as diagram rooms.

### Granularity

- **Logout** closes the sockets of that one session. The same user's other tabs and devices hold
  other sessions and stay connected.
- **Password reset, disable, admin delete and account delete** close every socket admitted by any
  session of that user.
- **Share-link revoke** closes the sockets admitted by that link or that joined a board through it.
  The owner, signed in with a cookie, is in no room for the link and stays connected. So do guests
  on other links to the same board.

### Ordering

Every use case calls `accessRevoked` after the delete has resolved. A socket that reconnects in
response to the close runs the handshake against a store where the credential no longer exists, and
is refused.

`DeleteAccountUseCase` makes no session call: `sessions.user_id` is `ON DELETE CASCADE`, so the
sessions end when `users.delete` commits, and the revoke is sent after that.

A handshake that is still running when a revoke is sent can miss it. Its lookup read the credential
before the delete, and it joins its rooms after the close was broadcast. That socket is connected
but in no board: `join-room` and `join-room-guest` look the credential up again when the socket
tries to join, and refuse. `join-room-guest` joins the link's room before that lookup, so a revoke
that commits after the lookup still finds the socket in the room. A test holds the lookup open,
revokes the link, then lets the lookup finish, and checks that the socket is closed.

### What the client sees

Before disconnecting, the server sends `access-revoked` with `{ reason }`, which is
`session-ended` or `share-link-revoked`. The disconnect then reaches the client as
`io server disconnect`. `socket.io-client` does not retry that, and a retry would be refused
anyway. `useSocketConnection` sets the board to `error` with the es-MX copy the handshake refusal
already uses: "Tu sesión terminó. Recarga la página para volver a entrar." or "Este enlace ya no es
válido. Pide uno nuevo.". A server disconnect with no notice falls back to the handshake's
`unauthenticated` copy for the join mode. Before this change the badge would have shown
"Reconnecting..." with no reconnect coming.

### Multi-instance

- **With Redis** (`REDIS_URL` set, ADR-021): the notice is a broadcast, and
  `disconnectSockets` is published on the adapter's request channel. Every instance applies it,
  including the one that published it, since that instance also receives its own request. Both go
  out on the same publisher connection in order, so each instance gets the notice before the close.
- **Without Redis**: only the instance that served the HTTP request closes its own sockets. This is
  the same limit ADR-027 accepted for notifications. A second instance without Redis would keep
  revoked sockets open on the instances that did not handle the request.

### Failure

`accessRevoked` does nothing when no Server is attached, and catches and logs a synchronous throw
from the adapter, without the token. The logout or revoke has already committed and returns
normally. With Redis, a failed publish is an async rejection inside the adapter, the same as for
every other emit. The credential is still gone, so the socket's next reconnect is refused.

## Alternatives Considered

- **A per-instance `Map` from credential to socket ids.** It never reaches a socket held by another
  instance, and it needs cleanup on every disconnect.
- **`fetchSockets()` and filtering on `socket.data`.** It needs the credential stored in
  `socket.data`, which the Redis adapter serializes across instances, and it costs a cross-instance
  round trip on every revoke.
- **Raw tokens as room names.** They would travel through Redis channel names (see above).
- **Closing every tab of the user on logout.** Signing out on one device should not sign the user
  out everywhere. A reset, a disable and a delete do mean everywhere, and they already delete every
  session.
- **Checking the credential again on every event.** ADR-031 rejected this: a database round trip per
  cursor move.
- **A separate `ConnectionRevoker` port.** It would have the same `attach`, the same log-and-continue
  rule and the same adapter dependency as `RealtimeNotifier`, all written a second time.

## Consequences

- Logout, reset, disable, admin delete, account delete and share-link revoke close the sockets those
  credentials admitted, on every instance that shares the Redis adapter.
- **Expiry closes nothing.** A session or link that expires has no write to hook into. Its socket
  stays open until it disconnects, and the reconnect is refused, as in ADR-031.
- **Links deleted by cascade close nothing.** Deleting a user removes the links they created, and
  deleting a diagram removes its links. Guests on those links stay connected until they reconnect.
  Covering this means listing the links before the delete.
- **Changing a password does not end the user's other sessions**, so it closes no sockets. That is
  a product decision this ADR does not make.
- A signed-in user who opened a board through a share link is admitted by their session. Logging out
  closes that board even though the link is still valid, and a reload reconnects through the link.
- Handlers accept an event for any room the socket is in (`socket.rooms.has(roomId)`), and the
  access rooms are now among them. A client that names one can send cursor and raise-hand events to
  its own other sessions or to other guests of the same link. Those guests are already on the same
  board. Board data is unaffected: scene writes need a room role, and comment writes need access to
  a diagram.
- A tab loaded before this deploy does not know `access-revoked`. When revoked, it shows
  "Reconnecting..." until the user reloads, and it gets no more updates.
