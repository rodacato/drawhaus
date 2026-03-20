# ADR-008: Remove Multi-Scene Support

**Status:** accepted
**Date:** 2026-03-19

## Context

Multi-scene (tabs) was added in v0.4.0 for slide-like workflows. In practice, it added complexity to the collaboration layer (per-scene rooms, scene switching, cross-scene save races) without delivering real value for diagramming.

## Decision

Remove multi-scene UI and API. Each diagram has exactly **one scene**.

- Delete SceneTabBar component and scene CRUD routes.
- Keep `scenes` table with a single row per diagram (lazy migration to "Scene 1").
- Preserve internal scene references for comments and Drive sync.

## Alternatives Considered

- **Keep multi-scene** — rejected: caused bugs (content loss on switch, race conditions), complicated collab protocol, no user demand.
- **Drop scenes table entirely** — rejected: too invasive migration. Keeping the table with one row per diagram is simpler and allows rollback.

## Consequences

- Simpler collaboration: one room per diagram, no scene switching logic.
- Snapshot system operates on a single scene (simpler restore).
- `scenes` table remains in the database — conservative approach for rollback safety.
- Scene-scoped features (comments, Drive sync) continue to work via the single scene record.
