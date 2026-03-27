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

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `join-room` | `{ roomId }` | Join as authenticated user (uses session cookie) |
| C → S | `join-room-guest` | `{ shareToken, guestName }` | Join as guest via share link |
| S → C | `room-joined` | `{ roomId, role, userId }` | Confirms successful join |
| S → C | `room-error` | `{ message }` | Join or operation failed |
| S → Room | `room-presence` | `{ roomId, users: PresenceUser[] }` | Updated user list on join/leave |
| S → Room | `cursor-left` | `{ userId }` | User disconnected from room |

### Scene Sync

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| S → C | `scene-from-db` | `{ elements, appState, scenes, activeSceneId }` | Initial scene data on join |
| C → S | `scene-update` | `{ roomId, sceneId?, elements }` | Broadcast full element state (fallback for large changes) |
| S → Room | `scene-updated` | `{ roomId, sceneId, fromUserId, fromSocketId, elements }` | Relayed full element state |
| C → S | `scene-delta` | `{ roomId, sceneId?, changed, removedIds }` | Incremental element changes (preferred) |
| S → Room | `scene-delta-received` | `{ roomId, sceneId, fromUserId, fromSocketId, changed, removedIds }` | Relayed incremental changes |
| C → S | `save-scene` | `{ roomId, sceneId?, elements, appState }` | Persist scene to database (server-side merge) |
| S → C | `scene-saved` | `{ roomId, sceneId }` | Confirms save succeeded |

### Edit Lock (deprecated — no-op)

**Concurrent editing** replaced the global edit lock. Multiple users can edit simultaneously. Conflicts are resolved via element-level merge (higher `version` wins). Events are preserved for backwards compatibility but have no functional effect — `request-edit-lock` always responds with `acquired: true`.

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `request-edit-lock` | `{ roomId }` | Always responds with acquired (no-op) |
| S → C | `edit-lock-acquired` | `{ roomId, holder: { userId, userName } }` | Always sent immediately |
| C → S | `release-edit-lock` | `{ roomId }` | No-op |
| S → Room | `edit-lock-status` | `{ roomId, holder: { userId, userName } \| null }` | Lock state broadcast (compat) |

### Raise Hand

Lightweight signaling for requesting attention or indicating a question. Not tied to the edit lock.

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `raise-hand` | `{ roomId }` | Signal raised hand to room |
| S → Room | `hand-raised` | `{ roomId, userId, userName }` | Hand raised broadcast |
| C → S | `lower-hand` | `{ roomId }` | Lower hand |
| S → Room | `hand-lowered` | `{ roomId, userId }` | Hand lowered broadcast |

### Cursors & Viewports (volatile)

Cursor and viewport events use `socket.volatile` — messages may be dropped under backpressure. This is intentional; these are ephemeral and high-frequency.

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `cursor-move` | `{ roomId, x, y }` | Send cursor position |
| S → Room | `cursor-moved` | `{ userId, name, x, y }` | Relayed cursor position (volatile) |
| C → S | `viewport-update` | `{ roomId, scrollX, scrollY, zoom }` | Send viewport state |
| S → Room | `viewport-updated` | `{ userId, scrollX, scrollY, zoom }` | Relayed viewport (volatile) |
| C → S | `request-viewport` | `{ roomId, targetUserId }` | Request another user's viewport |
| S → C | `provide-viewport` | `{ requesterId }` | Asks target to send their viewport |

### Comments

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| C → S | `comment-create` | `{ roomId, elementId, body, sceneId? }` | Create new comment thread |
| S → Room | `comment-created` | `{ roomId, thread }` | New thread broadcast |
| C → S | `comment-reply` | `{ roomId, threadId, body }` | Reply to thread |
| S → Room | `comment-replied` | `{ roomId, threadId, reply }` | Reply broadcast |
| C → S | `comment-resolve` | `{ roomId, threadId, resolved }` | Resolve/unresolve thread |
| S → Room | `comment-resolved` | `{ roomId, thread }` | Resolution broadcast |
| C → S | `comment-delete` | `{ roomId, threadId }` | Delete thread |
| S → Room | `comment-deleted` | `{ roomId, threadId }` | Deletion broadcast |

### Snapshots

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| S → Room | `snapshot-created` | `{ diagramId, snapshot }` | Auto-snapshot on interval or last editor disconnect |

### Drive Sync

| Direction | Event | Payload | Description |
|-----------|-------|---------|-------------|
| S → C | `drive-sync-status` | `{ sceneId, synced, error? }` | Google Drive sync result |

---

## Rate Limits

| Bucket | Max per second | Applied to |
|--------|---------------|------------|
| `scene` | 30 | `scene-update` |
| `cursor` | 60 | `cursor-move`, `viewport-update` |
| `comment` | 10 | All comment events |

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

| Event | Throttle | Notes |
|-------|----------|-------|
| `scene-update` | 50ms (100ms if >200 elements) | Adaptive based on scene complexity |
| `cursor-move` | 30ms | |
| `viewport-update` | 100ms | |
| `save-scene` | 1200ms debounce | Falls back to REST API if disconnected |
