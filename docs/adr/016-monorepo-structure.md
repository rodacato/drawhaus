# ADR-016: Monorepo Reorganization (apps/ + packages/)

**Status:** accepted
**Date:** 2026-03-20

## Context

The monorepo originally had `frontend/` and `backend/` at the root. As shared packages emerged (helpers, MCP, plantuml-to-excalidraw), the flat structure didn't scale.

## Decision

Reorganize into `apps/` and `packages/`:

```
apps/
├── backend/      # Express API + Socket.IO
└── frontend/     # Vite + React SPA
packages/
├── helpers/      # @drawhaus/helpers — element builders, layout, validator
├── mcp/          # @drawhaus/mcp — MCP server
└── plantuml-to-excalidraw/  # PlantUML parser + converter
```

npm workspaces handle cross-package resolution by `package.json` name, not path.

## Alternatives Considered

- **Keep flat structure** — rejected: `packages/` need clear separation from apps.
- **Polyrepo (separate repos per package)** — rejected: tight coupling between packages and apps makes cross-repo development painful. Single repo, single CI.
- **Turborepo / Nx** — rejected: npm workspaces are sufficient. No need for build orchestration tooling yet.

## Consequences

- Shared code lives in `packages/` with independent `package.json` files.
- Each package can be published to npm independently.
- CI builds all workspaces; changes to a package trigger dependent app builds.
- Import paths use package names: `import { createRect } from "@drawhaus/helpers"`.
