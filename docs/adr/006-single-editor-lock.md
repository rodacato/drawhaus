# ADR-006: Single-Editor Lock over CRDT

**Status:** accepted
**Date:** 2026-03-07

## Context

Real-time collaboration needed a concurrency model. True multi-writer editing requires CRDT (Yjs/Automerge) which means rewriting the Excalidraw collaboration layer.

## Decision

Implement a **single-editor lock** model: only one person can edit at a time, others see live read-only updates.

- Lock acquired on `onPointerDown` (not onChange) to prevent spam.
- Auto-release after 5 seconds of inactivity.
- Server-side enforcement: reject `scene-update`/`save-scene` without valid lock.
- Canvas starts in view-only mode until lock is confirmed.

## Alternatives Considered

- **CRDT (Yjs/Automerge)** — rejected: requires replacing Excalidraw's collab protocol entirely. Massive effort for a small-team tool where simultaneous editing is rare.
- **Last-write-wins** — rejected: data loss risk on concurrent edits.
- **Operational Transform** — rejected: complex to implement correctly, same effort as CRDT for worse results.

## Consequences

- Simple, predictable editing model for small teams.
- No merge conflicts — only the lock holder's changes are accepted.
- Pan/zoom allowed for all users regardless of lock state.
- Offline editing not supported (requires CRDT — see ADR on skipping offline mode).
- Lock handoff is automatic on disconnect with grace period for reconnection.
