# Drawhaus Socket Protocol

Socket.IO event contract for realtime collaboration.

## Connection

- **Transport:** Socket.IO with `msgpack` parser
- **Primary transport:** WebSocket (polling fallback)
- **Auth:** Session cookie (`drawhaus_session`) or share token
- **Scaling:** Optional Redis adapter for multi-server deployments

## Room Model

```
diagram (roomId)            ← presence, locks, comments
  └── scene (roomId:sceneId) ← element sync, cursors, viewports
```

Each diagram is a Socket.IO room. Scenes are sub-rooms scoped to `{roomId}:{sceneId}`.

---

## Events Reference

### Room Lifecycle

| Direction | Event             | Payload                             | Description                                      |
| --------- | ----------------- | ----------------------------------- | ------------------------------------------------ |
| C → S     | `join-room`       | `{ roomId }`                        | Join as authenticated user (uses session cookie) |
| C → S     | `join-room-guest` | `{ shareToken, guestName }`         | Join as guest via share link                     |
| S → C     | `room-joined`     | `{ roomId, role, userId }`          | Confirms successful join                         |
| S → C     | `room-error`      | `{ message }`                       | Join failed (never a save outcome)               |
| S → C     | `event-error`     | `{ event, message }`                | Payload of `event` failed validation (see below) |
| S → Room  | `room-presence`   | `{ roomId, users: PresenceUser[] }` | Updated user list on join/leave                  |
| S → Room  | `cursor-left`     | `{ userId }`                        | User disconnected from room                      |

### Payload Validation

Every client → server payload is checked against a Zod schema before any handler logic runs
(`onEvent` in `infrastructure/socket/helpers.ts`). A payload that fails is dropped and only the
sender receives `event-error` with `{ event, message: "Invalid payload" }`. It is deliberately
separate from `room-error`, which clients treat as a failed connection: a malformed event must not
tear down a session. Exceptions thrown inside a handler are logged server-side and never reach the
process. Optional `sceneId` fields accept `null` as well as omission. Comment events apply the same
limits as their REST routes: `body` 1–5000 characters (trimmed), `elementId` up to 200, and
`threadId` / `sceneId` must be UUIDs.

### Acknowledgements

A client may pass a Socket.IO ack callback after the payload of any client → server event. It is
optional: an event sent without one behaves exactly as before. When one is sent, `onEvent` answers
it at most once with `{ ok: true, ... }` or `{ ok: false, reason }`, where `reason` is
`invalid-payload` for a payload the schema rejected and `server-error` for a handler that threw.
Only `save-scene` answers its own outcomes today; every other handler leaves the callback to the
wrapper, so a client that acks them waits for its own timeout. See
[ADR-028](adr/028-save-acknowledgement.md).

### Scene Sync

| Direction | Event                  | Payload                                                                        | Description                                               |
| --------- | ---------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| S → C     | `scene-from-db`        | `{ elements, appState, scenes?, activeSceneId, revision }`                     | Scene data (see below)                                    |
| C → S     | `scene-update`         | `{ roomId, sceneId?, elements, revision? }`                                    | Broadcast full element state (fallback for large changes) |
| S → Room  | `scene-updated`        | `{ roomId, sceneId, fromUserId, fromSocketId, elements, revision }`            | Relayed full element state                                |
| C → S     | `scene-delta`          | `{ roomId, sceneId?, changed, removedIds, revision? }`                         | Incremental element changes (preferred)                   |
| S → Room  | `scene-delta-received` | `{ roomId, sceneId, fromUserId, fromSocketId, changed, removedIds, revision }` | Relayed incremental changes                               |
| C → S     | `save-scene`           | `{ roomId, sceneId?, elements, appState, revision? }`                          | Persist scene to database (server-side merge)             |
| S → C     | `scene-saved`          | `{ roomId, sceneId }`                                                          | Confirms save succeeded (kept for clients without an ack) |

`scene-from-db` is sent in four situations: on join, to the whole room after a snapshot restore,
to the whole room after a content `PATCH` (REST save fallback, public API, MCP), and to a single
client whose `save-scene` was refused as stale. It always carries the scene's current `revision`.
The three room-wide cases go through the `RealtimeNotifier` port ([ADR-027](adr/027-realtime-notifier-port.md)).

### Save Outcomes

`save-scene` answers the sender's ack callback on every path:

| Response                                | When                                                   |
| --------------------------------------- | ------------------------------------------------------ |
| `{ ok: true, sceneId }`                 | Written and merged; `scene-saved` is emitted too       |
| `{ ok: false, reason: "not-in-room" }`  | The socket never joined `roomId`                       |
| `{ ok: false, reason: "forbidden" }`    | The sender cannot edit the room                        |
| `{ ok: false, reason: "no-scene" }`     | No `sceneId` given and no active scene to fall back on |
| `{ ok: false, reason: "stale" }`        | Refused by the revision check; `scene-from-db` follows |
| `{ ok: false, reason: "server-error" }` | The save threw                                         |

A failed save is never reported as `room-error`, which clients treat as a lost connection. The
client emits with a 5 s ack timeout and reports the board as saved only on `{ ok: true }`; a
refusal and a timeout both show `Error`. A client that sends no callback still saves and still
receives `scene-saved`.

### Scene Revisions

A scene's `revision` counts the writes that **replaced** it — a snapshot restore, or a content
`PATCH` through the API or MCP (ADR-025). A merged `save-scene` never moves it.

Clients tag `save-scene`, `scene-delta` and `scene-update` with the revision their copy is based
on, the one they last received in `scene-from-db`:

- The server refuses a `save-scene` whose revision is not the scene's current one, writes nothing,
  and answers that client with `scene-from-db` instead of `scene-saved`. Without this, a save
  computed before a restore and arriving after it merges the removed elements back in.
- A client drops a relayed `scene-delta-received` / `scene-updated` tagged with a revision older
  than its own.
- On `scene-from-db` with a different revision, a client replaces its canvas and drops its unsaved
  edits; on the same revision (a reconnect) it keeps them.
- A payload with no revision is accepted unchecked, so a tab that predates this contract keeps
  working until it reloads.

See [ADR-026](adr/026-scene-revisions.md).

### Edit Lock (deprecated — no-op)

**Concurrent editing** replaced the global edit lock. Multiple users can edit simultaneously. Conflicts are resolved via element-level merge (higher `version` wins, then the lower `versionNonce`). Events are preserved for backwards compatibility but have no functional effect — `request-edit-lock` always responds with `acquired: true`.

| Direction | Event                | Payload                                            | Description                           |
| --------- | -------------------- | -------------------------------------------------- | ------------------------------------- |
| C → S     | `request-edit-lock`  | `{ roomId }`                                       | Always responds with acquired (no-op) |
| S → C     | `edit-lock-acquired` | `{ roomId, holder: { userId, userName } }`         | Always sent immediately               |
| C → S     | `release-edit-lock`  | `{ roomId }`                                       | No-op                                 |
| S → Room  | `edit-lock-status`   | `{ roomId, holder: { userId, userName } \| null }` | Lock state broadcast (compat)         |

### Raise Hand

Lightweight signaling for requesting attention or indicating a question. Not tied to the edit lock.

| Direction | Event          | Payload                        | Description                |
| --------- | -------------- | ------------------------------ | -------------------------- |
| C → S     | `raise-hand`   | `{ roomId }`                   | Signal raised hand to room |
| S → Room  | `hand-raised`  | `{ roomId, userId, userName }` | Hand raised broadcast      |
| C → S     | `lower-hand`   | `{ roomId }`                   | Lower hand                 |
| S → Room  | `hand-lowered` | `{ roomId, userId }`           | Hand lowered broadcast     |

### Cursors & Viewports (volatile)

Cursor and viewport events use `socket.volatile` — messages may be dropped under backpressure. This is intentional; these are ephemeral and high-frequency.

| Direction | Event              | Payload                              | Description                        |
| --------- | ------------------ | ------------------------------------ | ---------------------------------- |
| C → S     | `cursor-move`      | `{ roomId, x, y }`                   | Send cursor position               |
| S → Room  | `cursor-moved`     | `{ userId, name, x, y }`             | Relayed cursor position (volatile) |
| C → S     | `viewport-update`  | `{ roomId, scrollX, scrollY, zoom }` | Send viewport state                |
| S → Room  | `viewport-updated` | `{ userId, scrollX, scrollY, zoom }` | Relayed viewport (volatile)        |
| C → S     | `request-viewport` | `{ roomId, targetUserId }`           | Request another user's viewport    |
| S → C     | `provide-viewport` | `{ requesterId }`                    | Asks target to send their viewport |

### Comments

| Direction | Event              | Payload                                 | Description               |
| --------- | ------------------ | --------------------------------------- | ------------------------- |
| C → S     | `comment-create`   | `{ roomId, elementId, body, sceneId? }` | Create new comment thread |
| S → Room  | `comment-created`  | `{ roomId, thread }`                    | New thread broadcast      |
| C → S     | `comment-reply`    | `{ roomId, threadId, body }`            | Reply to thread           |
| S → Room  | `comment-replied`  | `{ roomId, threadId, reply }`           | Reply broadcast           |
| C → S     | `comment-resolve`  | `{ roomId, threadId, resolved }`        | Resolve/unresolve thread  |
| S → Room  | `comment-resolved` | `{ roomId, thread }`                    | Resolution broadcast      |
| C → S     | `comment-delete`   | `{ roomId, threadId }`                  | Delete thread             |
| S → Room  | `comment-deleted`  | `{ roomId, threadId }`                  | Deletion broadcast        |

The four `S → Room` events above are also emitted for the REST comment routes, which the client
falls back to when the socket is down. `POST /comments/:threadId/like` has no socket counterpart
and broadcasts nothing.

### Snapshots

| Direction | Event               | Payload                                 | Description                                                                                    |
| --------- | ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| S → Room  | `snapshot-created`  | `{ diagramId, snapshot? }`              | Auto-snapshot on interval or last editor disconnect; also on manual create and after a restore |
| S → Room  | `snapshot-restored` | `{ diagramId, restoredBy, snapshotId }` | A snapshot was restored; followed by `scene-from-db`                                           |

### Drive Sync

| Direction | Event               | Payload                       | Description                                                            |
| --------- | ------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| S → C     | `drive-sync-status` | `{ sceneId, synced, error? }` | Google Drive sync result for the signed-in saver; never sent to guests |

---

## Rate Limits

| Bucket    | Max per second | Applied to                       |
| --------- | -------------- | -------------------------------- |
| `scene`   | 30             | `scene-update`                   |
| `cursor`  | 60             | `cursor-move`, `viewport-update` |
| `comment` | 10             | All comment events               |

Rate limits are disabled when `NODE_ENV=test`.

## Types

```typescript
type PresenceUser = {
  userId: string;
  name: string;
  isGuest: boolean;
};

type Role = "owner" | "editor" | "viewer";
```

## Throttling (Client-Side)

| Event             | Throttle                      | Notes                                                  |
| ----------------- | ----------------------------- | ------------------------------------------------------ |
| `scene-update`    | 50ms (100ms if >200 elements) | Adaptive based on scene complexity                     |
| `cursor-move`     | 30ms                          |                                                        |
| `viewport-update` | 100ms                         |                                                        |
| `save-scene`      | 1200ms debounce               | 5s ack timeout; falls back to REST API if disconnected |
