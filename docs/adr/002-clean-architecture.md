# ADR-002: Clean Architecture for Backend

**Status:** accepted
**Date:** 2026-01-15

## Context

The backend started as a flat Express app. As features grew (auth, sharing, workspaces, comments), the codebase needed clear boundaries to stay navigable.

## Decision

Adopt **Clean Architecture** with three layers:

- `domain/` — entities and business rules (zero framework dependencies)
- `application/` — use cases orchestrating domain logic
- `infrastructure/` — Express routes, repositories, Socket.IO handlers, external services

A **composition root** wires dependencies at startup without a DI container.

## Alternatives Considered

- **Flat structure** — rejected: already causing confusion at ~15 route files.
- **DI container (tsyringe, inversify)** — rejected: too heavy for the project size. Manual composition root is simpler and explicit.
- **Hexagonal/ports-and-adapters** — considered: Clean Architecture is essentially this with named layers. Chose the more common naming.

## Consequences

- Every new feature follows `route → use case → repository` flow.
- Domain layer has no Express or pg imports.
- Composition root (`composition/index.ts`) is the single place to see all wiring.
- `validate()` middleware handles all input validation at the infrastructure boundary.
- `requireAccess` helpers centralize authorization checks in the application layer.
