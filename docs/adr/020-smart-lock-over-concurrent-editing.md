# ADR-020: Smart Lock with Queue over Concurrent Editing

**Status:** superseded by [ADR-022](022-concurrent-editing-over-lock.md)
**Date:** 2026-03-27
**Supersedes:** ADR-006 (Single-Editor Lock over CRDT)

## Context

ADR-006 established the single-editor lock model. While functional, the UX is frustrating: a blocking overlay with `cursor-not-allowed`, a bubble that disappears in 2 seconds, no countdown, no queue, and a 5-second inactivity timeout that feels long.

We evaluated migrating to concurrent editing by removing the lock (delta updates + server-side merge with `SELECT ... FOR UPDATE`). A panel of 6 experts assessed both options unanimously: improve the lock, don't remove it.

Key finding: every product with real concurrent editing on canvas (Figma, Miro, Excalidraw.com, tldraw) uses CRDTs or OT — technologies with mathematical convergence guarantees. No successful product uses artisanal version-based merge for concurrent canvas editing.

## Decision

Improve the existing lock with:
- Reduced timeout (5s → 2.5s) and grace period (3s → 1s)
- Server-side FIFO wait queue with auto-assign on release
- Persistent badge with countdown instead of blocking overlay
- Free navigation (pan/zoom/select) without lock via `viewModeEnabled`

Do not implement artisanal concurrent editing. When needed (5+ simultaneous editors), adopt Yjs (CRDT) as a proven library.

## Alternatives Considered

- **Concurrent editing with artisanal merge** — rejected: ~10 days, 14 files, risk of silent data loss. The merge-by-version approach lacks mathematical convergence guarantees. All code would be discarded when adopting CRDTs.
- **Per-element locking** — rejected: Excalidraw has no native "element-selected" event. Operations like grouping or aligning affect multiple elements. Complexity of thousands of locks with heartbeats is unjustified.
- **Keep current lock unchanged** — rejected: poor feedback is the main user complaint.

## Consequences

- Maximum wait drops from 5s to 2.5s
- Queued users receive their turn automatically (zero "can't edit" frustration)
- Free navigation while waiting (pan, zoom, select)
- Model remains 1 writer at a time — zero conflict or data loss risk
- Clean migration path to CRDTs preserved without artisanal merge tech debt
