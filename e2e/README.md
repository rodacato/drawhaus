# E2E Tests

End-to-end tests for Drawhaus using [Playwright](https://playwright.dev/). They are the only place
canvas behaviour is tested: Excalidraw does not load in jsdom or Node. CI runs them on every PR.

## Running locally

1. **Database.** Create a disposable database once. The default is `drawhaus_e2e` on host `db`:
   ```bash
   psql -h db -U drawhaus -d postgres -c "CREATE DATABASE drawhaus_e2e"
   ```
   The suite refuses any database whose name does not end in `_e2e` or `_test`, because it drops
   and recreates the schema every time it starts the backend.
2. **Browser.** Install Chromium once (`npx playwright install chromium`). If it cannot launch
   for lack of system libraries, run `sudo npx playwright install-deps chromium`.
3. **Ports.** 4000 and 5173 must be free. Playwright starts the backend (`tsx src/main.ts`,
   `NODE_ENV=test`) and the Vite dev server itself, and never attaches to a server it did not
   start unless you ask for it.
4. **Run** from `e2e/`:
   ```bash
   npm test                                  # whole suite, Chromium, one worker
   npx playwright test -g "survives a reload" # a single test; every test runs on its own
   npx playwright show-report --host 0.0.0.0 # HTML report (port 9323 from a devcontainer)
   ```

| Variable             | Default                                             | Purpose                                                         |
| -------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`       | `postgres://drawhaus:drawhaus@db:5432/drawhaus_e2e` | Must end in `_e2e` or `_test`; wiped on every server start      |
| `REDIS_URL`          | unset                                               | Only passed through when set; unset uses in-memory fallbacks    |
| `E2E_REUSE_SERVER=1` | off                                                 | Attach to servers already on 4000/5173 (no database reset)      |
| `E2E_MARKETING=1`    | off                                                 | Adds the marketing screenshot generator (`npm run screenshots`) |

`--ui`, `--headed` and `--debug` need a display, so they only work outside a devcontainer.

## How it works

- **Global setup** creates the admin (`admin@drawhaus.test`) through `/setup` and a regular
  primary user (`e2e@drawhaus.test`) whose session backs the default `page` and `request`.
- **Fixtures** (`fixtures/test.ts`): `createUser` registers a fresh user per test, `adminApi` and
  `anonApi` are API contexts, `openAs` opens a browser context for a user or signed out.
- **Data helpers** (`fixtures/api.ts`) create diagrams, workspaces, share links and the rest
  through the API and throw on any non-2xx. A failed setup fails the test instead of skipping it.
  There are no conditional skips and no serial chains.
- **Canvas tests** (`tests/collaboration/`, `pages/board.page.ts`) drive Excalidraw through the
  UI, often with two browser contexts on one board. They read the live scene from the `window.h`
  hook of Excalidraw's development build, so they must run against the Vite dev server. Socket
  frames are decoded with `support/socket-traffic.ts` to check what each client sends.

## Known product bugs

A test titled `… (bug: …)` is a `test.fixme` asserting the correct behaviour of a bug that is not
fixed yet. Remove the `fixme` in the change that fixes the bug. List them with
`npx playwright test --list | grep "bug:"`.

## Visual regression

`visual.spec.ts` compares pages with the baselines in `visual.spec.ts-snapshots/` at a 5% pixel
tolerance, which catches layout breaks rather than content changes. Update baselines only for an
intentional UI change, and scope the update to the tests you changed:
`npx playwright test visual.spec.ts -g "<test title>" --update-snapshots=all`. The bare flag means
`changed`, which keeps any baseline still within tolerance. Open the new PNG before committing it:
a baseline records whatever page loaded, redirects included. At 5% the login page passes as the
forgot-password page, so that test asserts its heading before the screenshot.

## Layout

```
e2e/
├── playwright.config.ts   # servers, database guard, projects
├── scripts/reset-db.ts    # drops and recreates the schema before the backend starts
├── support/               # database guard, scene reader, socket traffic, two-user boards
├── fixtures/              # test fixtures, API helpers, demo data for marketing screenshots
├── pages/                 # page objects (login, dashboard, board)
└── tests/
    ├── global-setup.ts
    ├── collaboration/     # real-canvas scenarios: persistence, realtime, roles
    ├── marketing/         # screenshot generator, only with E2E_MARKETING=1
    └── …                  # auth, admin, api, diagrams, permissions, sharing, workspaces, visual
```
