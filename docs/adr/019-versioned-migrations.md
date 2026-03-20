# ADR-019: Versioned Database Migrations

**Status:** accepted
**Date:** 2026-03-19

## Context

Database schema changes were managed with inline DDL scripts. As the schema grew (workspaces, snapshots, API keys, templates), tracking changes became error-prone and deployments risky.

## Decision

Adopt **node-pg-migrate** for versioned, repeatable database migrations. Migration files live alongside backend code and run automatically on deploy.

## Alternatives Considered

- **Inline DDL scripts** — rejected: no rollback support, no tracking of which migrations ran, manual ordering.
- **Knex migrations** — rejected: adds a query builder dependency when we use raw SQL. node-pg-migrate is migration-only.
- **Prisma** — rejected: ORM layer is overkill when the project uses raw pg queries intentionally.

## Consequences

- Schema changes tracked as timestamped migration files.
- Rollback support via `down` migrations.
- Migration files copied to Docker production image for deploy-time execution.
- `npm run db:reset` drops + recreates + runs all migrations + seeds.
- Each migration is a discrete, reviewable change.
