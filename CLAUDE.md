# Claude Code — Project Instructions

## Documentation Sync

When making changes that affect any of the following, update the corresponding docs **in the same commit**:

- **New/changed API endpoints** → Update the API Overview table in `README.md`
- **New/changed env vars** → Update `README.md` env vars table and `.env.example`
- **New/changed CLI commands** → Update the Commands table in `README.md`
- **New features shipped** → Add entry to `CHANGELOG.md` under the current version
- **Completed roadmap items** → Mark as done in `ROADMAP.md`
- **New frontend routes** → Update the Routes table in `README.md`

## Project Conventions

- **Language**: The user communicates in Spanish. Respond in Spanish unless code/docs are in English.
- **Commits**: Do not add co-author lines unless explicitly asked.
- **Backend architecture**: Clean Architecture — `application/` (use cases), `domain/` (entities), `infrastructure/` (routes, repos, services, sockets).
- **Validation**: Use Zod schemas for all route input validation.
- **Tests**: Backend unit tests in `backend/src/**/*.test.ts`. E2E tests in `e2e/` with Playwright.
- **Rate limiting**: Disabled in `NODE_ENV=test` to prevent flaky e2e tests.
- **Setup flow**: First registered user becomes admin and auto-completes setup.

## Commands

```bash
npm run dev              # Start frontend + backend
npm test --workspace=backend  # Backend tests
npm run test:e2e         # Playwright e2e (needs running services)
npm run lint             # Lint all workspaces
npm run typecheck        # Type-check all workspaces
npm run db:seed          # Seed test data
npm run db:reset         # Drop + recreate + seed
npm run db:backup --workspace=backend   # On-demand backup
npm run db:restore --workspace=backend -- latest  # Restore latest backup
```
