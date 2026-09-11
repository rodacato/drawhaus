# ADR-025: First Scene as the Single Write Path for Diagram Content

**Status:** accepted
**Date:** 2026-09-11

## Context

Diagram content (`elements` + `appState`) lives in two places: the `diagrams` row and the diagram's scene (ADR-008 kept one `scenes` row per diagram). The scene is created lazily the first time a board is opened, seeded from the row, and from then on the realtime save path (`save-scene`) writes only the scene.

The REST and public API update path went the other way. `PATCH /api/diagrams/:id` and `PATCH /v1/diagrams/:id` wrote `diagrams.elements` / `app_state`, while `GET` returned the first scene's content whenever a scene existed. Once a diagram had been opened on a board, every API or MCP content update answered 200 and was never seen again. The same `PATCH` is the frontend's save fallback when the socket is down, so an offline save was lost the same way.

Readers were split too: `GET` used the scene, but duplicating a diagram and resolving a share link (the share and embed pages) read the row, so they served content that could be days behind the board.

## Decision

**The first scene is the only write target for diagram content; `diagrams.elements` / `app_state` is a mirror.**

- `DiagramRepository.update` writes `elements` / `appState` into the first scene (lowest `sort_order`, then oldest), creating it if it does not exist yet, the same way `join-room` does: named "Scene 1" and seeded from the row for any field not being written. Then it copies the scene's content onto the row. All of this happens in one transaction, with the diagram row locked `FOR NO KEY UPDATE` so concurrent PATCHes on a diagram serialize.
- Content keeps its replace semantics: each field sent replaces the stored one. A PATCH is not merged by element version.
- `title` stays on the row. A title-only update never touches, or creates, a scene.
- Readers go through the first scene when one exists (`withSceneContent` in `application/helpers/`): get, update's response, duplicate, share-link resolve.
- `DiagramRepository.updateScene`, which wrote the row alone and had no callers, is removed, so no row-only content write path remains.

## Alternatives Considered

- **Write to both sides from the use case.** Two repository calls could not share one transaction without a unit-of-work port and client-aware repositories, a refactor of every Pg repository for one use case. The aggregate write lives in the diagram repository instead, where the transaction is local.
- **Make `diagrams` the source of truth again.** Rejected: the realtime path, snapshots, restore, and comments all key off the scene (ADR-008, ADR-022). Moving them back is the invasive migration ADR-008 avoided.
- **Drop the content columns from `diagrams`.** The cleanest end state, but it needs a migration and a backfill of scene-less diagrams, and the dashboard list still reads the row. Deferred; the mirror keeps it possible.
- **Merge PATCH content by element version, like `save-scene`.** Rejected: API and MCP callers send the whole diagram ("replace the existing values entirely", per the MCP tool contract). A merge would resurrect elements they deleted.

## Consequences

- API, MCP, and the frontend's REST save fallback persist content that `GET` returns, whether or not the board was ever opened.
- Duplicate and the share and embed pages show the board's current content.
- The mirror is only as fresh as the last `PATCH`. Realtime saves still write only the scene, so the row lags while a board is being edited. Any reader that needs content must go through the first scene; the row is a seed for diagrams that have never been opened. The dashboard list (`GET /api/diagrams`, search) still returns the row's copy.
- **Open boards are not notified of API writes.** A client with the board open keeps its old canvas, and its next `save-scene` merges by element version. That can put back elements the API removed. Broadcasting REST/v1/MCP writes to live rooms (a `RealtimeNotifier` port replacing `IoHolder`) is the next step.
- Two first-open requests racing (`join-room` versus a content `PATCH`) can still create two scenes. Readers agree on which one is first, so content stays consistent, but a unique index on `scenes(diagram_id)` would remove the race and needs a migration.
