# ADR-022: Concurrent Editing over Global Lock

**Status:** accepted
**Date:** 2026-03-27
**Supersedes:** ADR-020 (Smart Lock with Queue), ADR-006 (Single-Editor Lock)

## Context

ADR-020 improved the single-editor lock with a FIFO queue, countdown badge, and reduced timeouts. While this improved the UX, the fundamental limitation remained: only one person can edit at a time.

For teams of 2-5 users (Drawhaus's target audience), waiting 2.5 seconds per edit turn is still friction. The collaboration layer already had the building blocks for concurrent editing:

- Elements have `id` (UUID) and `version` (monotonic counter)
- `mergeElements()` already resolved conflicts by keeping higher-version elements
- Real-time cursors show where each user is working
- The audience is small teams, not 50-person enterprise rooms

## Decision

Replace the global edit lock with concurrent editing:

1. **Element-level merge** — `mergeElements` (version comparison) moved to `@drawhaus/helpers` for frontend + backend sharing
2. **Delta updates** — new `scene-delta` socket event sends only changed/removed elements instead of full state
3. **Server-side merge** — `save-scene` uses `SELECT ... FOR UPDATE` in a PostgreSQL transaction to merge incoming elements with DB state
4. **Delete wins** — if a user deletes an element, it's removed for all users regardless of version
5. **Orphan cleanup** — arrow bindings and group memberships pointing to deleted elements are automatically cleaned up
6. **Conflict feedback** — toasts notify users when their edits are overwritten or elements they were editing are deleted

Lock events (`request-edit-lock`, `release-edit-lock`) are preserved as no-ops for backwards compatibility.

## Alternatives Considered

- **Keep improved lock (ADR-020)** — rejected: still blocks concurrent editing, the core frustration for small teams
- **Adopt Yjs/CRDT** — deferred: adds ~50KB to bundle, requires rewriting the entire collab layer. Element-level merge is sufficient for <10 concurrent editors. Yjs remains the path for large-room scaling if needed
- **Operational Transformation** — rejected: complex to implement correctly, no off-the-shelf OT for canvas elements

## Security

- Server rejects deltas that remove >50% of elements (wipe attack prevention)
- Server rejects elements with version >100,000 (version inflation prevention)
- `canEdit()` permission check on all scene events (unchanged)

## Consequences

- All editors can edit simultaneously — zero wait time
- Delta updates reduce payload ~80% for typical edits
- Server-side merge with `FOR UPDATE` serializes concurrent saves (prevents data loss)
- Conflict resolution is deterministic: higher version wins, delete wins
- Users see toasts when conflicts occur (not silent)
- No CRDT dependency — simpler architecture, smaller bundle
- Trade-off: two users editing the same element simultaneously will have one overwritten (acceptable for <10 users with visible cursors)
