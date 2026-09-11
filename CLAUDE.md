# Claude Code — Project Instructions

## Documentation Sync

When making changes that affect any of the following, update the corresponding docs **in the same commit**:

- **New/changed API endpoints** → Update the API Overview table in `README.md`
- **New/changed env vars** → Update `README.md` env vars table and `.env.example`
- **New/changed CLI commands** → Update the Commands table in `README.md`
- **New features shipped** → Add entry to `CHANGELOG.md` under the current version, and add the capability to "What's Been Built" in `docs/ROADMAP.md`
- **Completed work** → Move its item to Done in the [GitHub Project](https://github.com/users/rodacato/projects/8) — the backlog; `docs/ROADMAP.md` keeps strategy only
- **New work or findings** → Capture as a draft item in the GitHub Project (private; never a public issue for security findings)
- **Architectural decisions** → Add ADR in `docs/adr/` and update Decision Log in `docs/ROADMAP.md`
- **New frontend routes** → Update the Routes table in `README.md`

## Project Conventions

- **Language**: The user communicates in Spanish. Respond in Spanish unless code/docs are in English.
- **Commits**: Do not add co-author lines unless explicitly asked.
- **Backend architecture**: Clean Architecture — `application/` (use cases), `domain/` (entities), `infrastructure/` (routes, repos, services, sockets).
- **Validation**: Use Zod schemas for all route input validation.
- **Tests**: Backend tests in `apps/backend/src/__tests__/` (`node --test` via tsx). Frontend tests in `apps/frontend/src/__tests__/` (Vitest + jsdom). E2E tests in `e2e/` with Playwright (currently disabled in CI).
- **Rate limiting**: Disabled in `NODE_ENV=test` to prevent flaky e2e tests.
- **Setup flow**: First registered user becomes admin and auto-completes setup.

## Commands

```bash
npm run dev              # Start frontend + backend
npm test --workspace=backend  # Backend tests
npm run test:pg --workspace=backend  # Backend tests against real Postgres (*_test database only)
npm test --workspace=frontend  # Frontend tests (vitest + jsdom)
npm test --workspace=frontend -- <pattern>  # Targeted frontend run, e.g. -- use-socket
npm run lint             # Lint all workspaces
npm run typecheck        # Type-check all workspaces
npm run db:seed          # Seed test data
npm run db:reset         # Drop + recreate + seed
npm run db:backup --workspace=backend   # On-demand backup
npm run db:restore --workspace=backend -- latest  # Restore latest backup

# Playwright (run from e2e/ directory)
cd e2e
npm test                 # Run all e2e tests
npm run test:headed      # Run with browser visible
npm run test:ui          # Open Playwright UI
npm run test:debug       # Debug mode
npm run test:update-snapshots  # Update visual snapshots
```
