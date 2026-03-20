# ADR-010: Workspaces over Per-Diagram Collaborators

**Status:** accepted
**Date:** 2026-03-05

## Context

Sharing and access control needed a model. The choice was between per-diagram collaborator lists (like Google Docs) or workspace-level access (like Notion/Linear).

## Decision

Use **workspace-level access** with roles (owner > admin > editor > viewer). All diagrams in a workspace inherit the workspace's member list.

## Alternatives Considered

- **Per-diagram collaborators** — rejected: doesn't scale for the contractor use case (separate clients cleanly, share all diagrams in a workspace at once instead of one by one).
- **Both (workspace + per-diagram overrides)** — rejected: complexity explosion in access resolution.

## Consequences

- Sharing a workspace shares all its diagrams automatically.
- Personal workspace per user for private diagrams.
- Lazy personal workspace creation: created on first `/api/workspaces` list call, no migration needed.
- Access resolution: `findAccessRole` checks owner > diagram member > workspace member.
- Admin-configurable limits: max 5 workspaces/user, max 5 members/workspace.
- Share links provide per-diagram guest access without requiring workspace membership.
