# ADR-027: A RealtimeNotifier Port for Writes That Did Not Come From a Room

**Status:** accepted
**Date:** 2026-09-11
**Refines:** ADR-025 (first scene as the single write path), ADR-026 (scene revisions)

## Context

Not every write to a diagram arrives over a socket. `PATCH /api/diagrams/:id` and
`PATCH /v1/diagrams/:id` (the REST save fallback, the public API, MCP), snapshot restore, snapshot
creation and the REST comment routes all commit without any room being involved.

ADR-025 made those content writes land in the first scene, so they are no longer lost. ADR-026
made them bump `scenes.revision`, so a board that was open when one landed has its next save
refused and resyncs. What neither did is tell the board. Until its debounce fires — or forever, if
the user is only reading — the canvas shows content the server has already replaced, and the user
keeps editing a scene that no longer exists.

The plumbing for pushing to a room existed but only for snapshots, and in the worst possible
shape: `IoHolder` (`{ io: Server | null }`) was a mutable box declared in `snapshot.routes.ts` and
filled in `main.ts` once `setupSocketServer` returned, because the routes are built before the
HTTP server. It leaked `socket.io` types into a route module, hard-coded four wire event names and
their payloads inside request handlers, and was reachable by exactly one route file. REST comment
writes had no broadcast at all: a comment created while the socket was down was invisible to
everyone else in the room until they reloaded.

## Decision

**One port, `RealtimeNotifier`, is how any non-socket write reaches an open board.**

- `domain/ports/realtime-notifier.ts` declares `sceneReplaced`, `snapshotRestored`,
  `snapshotCreated` and `commentChanged`. It names events in the domain's own terms and carries
  domain entities; no `socket.io` type appears in it, and no wire event name.
- `infrastructure/socket/realtime-notifier.ts` is the only adapter. It maps each call to the wire
  events the frontend already listens for, serializes entities the same way the REST responses do,
  and holds the `io` Server it is given by `attach()`.
- **`scene-from-db` is reused, not replaced.** It is already "the server replaced your scene, take
  this", emitted on join, on the ADR-026 stale-save path and on restore, and
  `useSceneManager` already applies it. A content `PATCH` now broadcasts it room-wide with the new
  elements, appState, scene id and revision.
- **Only a content write notifies.** The use case notifies when `elements` or `appState` was sent
  — exactly the predicate `DiagramRepository.update` uses to decide whether to touch a scene. A
  title-only update never touches a scene (ADR-025), so it never notifies.
- **A notification can never fail a write.** The adapter no-ops when no Server is attached and
  logs, rather than throws, when an emit fails. The write has already committed; there is nothing
  useful to do with the error at the caller.
- `IoHolder` is deleted. `main.ts` holds the `io` Server as a local and calls `attach` on it.

**The multi-instance assumption:** `io.to(room).emit()` fans out across instances only through the
Redis adapter (ADR-021), which attaches only when `REDIS_URL` is set. Whether production runs more
than one backend instance is still an open question and this ADR does not settle it. It assumes
the existing arrangement: with Redis, notifications reach every instance's rooms; without it, they
reach only the instance that served the request. That is the same guarantee `IoHolder` gave
snapshot restores, so nothing regresses — but if a second instance is ever added without Redis,
this port is one of the things that silently half-works.

## Alternatives Considered

- **An event bus (in-process emitter, or Redis pub/sub).** Rejected. There is one publisher shape
  and one subscriber, so a bus would add a layer of indirection, an event registry and an async
  hop for no decoupling that matters. It also loses the type checking a port gives: with an
  emitter, a payload shape change is caught at runtime, in production, by a board that renders
  nothing. If a second consumer ever appears (audit log, webhooks), a bus becomes the right shape
  and the port is what gets swapped behind it.
- **Keep `IoHolder` and pass it into more routes.** Cheapest, and the reason it is rejected is not
  aesthetics: it puts `socket.io` imports and wire event names into every route that writes, so
  the protocol ends up defined in six places with no single file to check it against.
- **A new event instead of reusing `scene-from-db`.** Would need a matching frontend handler and
  its own reconciliation rules, when `scene-from-db` already has exactly the semantics wanted, has
  the revision on it, and is already tested.
- **Notify from the repository.** The repository is where the revision is known most precisely,
  but it would make persistence depend on realtime, and a transaction's rollback would not undo an
  emit already sent.
- **Invent a `comment-liked` event for `POST /comments/:id/like`.** Rejected: the like route has
  no socket counterpart to mirror, so its wire shape would be a guess with no consumer. It stays
  un-broadcast and is recorded below.

## Consequences

- A board open during an API, MCP or REST content write updates without a reload, and no longer
  waits for its own save to be refused to find out. ADR-026's open end closes.
- **A client with unsaved local edits loses them when that broadcast lands.** This is ADR-026's
  rule, not a new one: `scene-from-db` carries the new revision, `SceneSync.isReplacedBy` is
  therefore true, and the client drops its local edits rather than merging them back — which is
  the entire point, since merging is what resurrected the elements the API removed. The window is
  now much smaller (the broadcast is immediate instead of one debounce away), but it is real and
  silent: the user gets no "your unsaved changes were replaced" signal. Surfacing one is a
  follow-up, not part of this port.
- REST comment writes now broadcast, so the socket-down fallback path is visible to the room like
  the socket path is.
- **The REST and socket comment broadcasts still disagree on shape.** The adapter emits dates as
  ISO strings, matching the REST responses and the frontend's declared `CommentThread` type;
  `comment.handler.ts` still emits raw domain entities, whose `Date`s survive msgpack as `Date`
  objects. Both happen to work on the frontend. Unifying them means changing a live wire shape and
  is left out of this change deliberately.
- `POST /api/diagrams/:diagramId/comments/:threadId/like` remains the one comment write that
  reaches nobody: likes are REST-only in both directions, with no socket event to mirror.
- The port has four methods, not the three the work was scoped with. `snapshotCreated` exists
  because `POST /snapshots` already broadcast a snapshot-list refresh through `IoHolder`, and
  dropping it to keep the method count would have been a regression.
