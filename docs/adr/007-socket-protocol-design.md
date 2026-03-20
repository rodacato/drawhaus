# ADR-007: Socket.IO Protocol Design

**Status:** accepted
**Date:** 2026-03-10

## Context

Real-time collaboration needs a well-defined event protocol. The system handles presence (cursors, users), element sync, comments, and edit locks.

## Decision

Adopt a **two-room model** with msgpack binary encoding:

- **Diagram room** — presence, locks, comments (joined by all viewers).
- **Scene sub-room** — element sync (joined by active editor + followers).

Use **msgpack** parser for binary encoding (smaller payloads than JSON). Add **perMessageDeflate** compression for messages >1KB.

Rate limits per event type:
- Scene updates: 30 req/s
- Cursor movements: 60 req/s (volatile/ephemeral)
- Comments: 10 req/s

## Alternatives Considered

- **Single flat room** — rejected: cursor events would flood all connections even for users on different scenes.
- **JSON encoding** — rejected: msgpack is ~30% smaller for element arrays with coordinates.
- **WebSocket raw (no Socket.IO)** — rejected: lose auto-reconnection, room management, and the Redis adapter ecosystem.

## Consequences

- Cursor/viewport events use `volatile.emit()` — acceptable loss for ephemeral data.
- Redis adapter (`@socket.io/redis-adapter`) enables horizontal scaling across containers.
- Graceful fallback to in-memory adapter when `REDIS_URL` is not set.
- Session middleware shared between Express and Socket.IO for consistent auth.
