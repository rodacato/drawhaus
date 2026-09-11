# Changelog

All notable changes to Drawhaus are documented here.

---

## Unreleased

### Added

- **A backend test tier that runs against real PostgreSQL.** No test ran SQL: every `pg-*.ts` repository sat at 0% coverage, and the in-memory fakes had drifted from the queries they stand in for. `npm run test:pg --workspace=backend` runs `src/__tests__/postgres/*.pg-test.ts` serially against `DATABASE_URL`, defaulting to the devcontainer's `drawhaus_test`. The hermetic `npm test` glob (`*.test.ts`) does not match those files. Before any query the run refuses a database whose name, as `pg` resolves it, does not end in `_test`. It then creates the database if missing, drops and rebuilds the schema from the migrations, and truncates every table except `schema_migrations` between tests. Repositories share the global pool and open their own transactions, so per-test rollback is not an option. CI's Validate job runs the tier against a `postgres:16-alpine` service. A `DiagramRepository` contract runs the same `findAccessRole`, `findByUser` and `search` assertions against the in-memory fake (in `npm test`) and Postgres. It caught the fake ignoring workspace members and searching only the caller's own diagrams. The fake now takes the workspace store and applies the SQL's visibility and role-mapping rules. The first Postgres tests cover the riskiest SQL. `updateSceneMerged`: concurrent saves all survive, and a save that waits on another transaction's row lock merges into what that transaction committed. ADR-025's `update`: a content update writes one first scene, seeded from the row and mirrored back, and a second writer waits on the diagram row instead of creating a second scene; a title-only update never touches a scene. Also covered: expired sessions are deleted on lookup, snapshot latest / named counts / `purgeAuto` keep rules, migrations applied from an empty schema, and what deleting a user or a workspace does to its diagrams. The locking and escaping tests were checked by removing `FOR UPDATE`, `FOR NO KEY UPDATE` and `escapeLike` in turn: each removal fails them.

- **The Playwright E2E suite runs in CI again, and now covers live collaboration on the real canvas.** It had been disabled because it failed on a fresh database. Global setup made `e2e@` the admin through `/setup`, then registered `admin@` on the page's own request context, which swapped the session cookie, so promoting `admin@` ran as `admin@` itself and silently got a 403; every admin and role test failed. 67 conditional `test.skip` guards and serial chains hid missing data, and several tests asserted nothing. Every test now creates its own data through fixtures (`createUser`, `adminApi`, `openAs`) whose helpers throw on any non-2xx, so any single test runs on its own. Locally the suite refuses a database whose name does not end in `_e2e`/`_test` (default `drawhaus_e2e`, wiped on each server start), reuses a running server only with `E2E_REUSE_SERVER=1`, and starts the backend without the developer `.env`, so Redis is used only when `REDIS_URL` is set. New canvas specs drive Excalidraw through the UI with two browser contexts and decode socket frames. The product bugs they found are pinned as `test.fixme` with the bug in the title: a cold load leaves the board in view mode; a drag's final version never reaches collaborators; a teammate mid-drag keeps an element someone deleted; Ctrl+S reports saved before the server acknowledges; workspace viewers emit scene edits; undo removes a teammate's change; Mermaid flowcharts with unlabeled nodes import as nothing; and the 401 interceptor sends signed-out visitors of `/forgot-password`, `/reset-password`, `/workspace-invite`, `/privacy`, `/terms` and `/self-host` to `/login` (the committed forgot-password visual baseline is a screenshot of the login page).
- **Prettier adopted as the repo's formatter.** The devcontainer already shipped `esbenp.prettier-vscode` while the repo had no Prettier dependency, config, or `.editorconfig`, so enabling format-on-save would have reformatted files against defaults nobody had chosen. Adds `prettier` at the root with `.prettierrc.json` (`printWidth: 100`, chosen to match the existing code — p90 line length is 78 — so the reformat stays minimal) and `.prettierignore`, plus `format` / `format:check` scripts. `eslint-config-prettier` is appended to both `eslint.config.mjs` files so ESLint stops asserting stylistic rules Prettier now owns. The devcontainer gains `editor.formatOnSave` with Prettier as the default formatter and `source.fixAll.eslint` on save. Applied across the repo in a separate commit (451 files).
- **Prometheus metrics via `prom-client`** (opt-in). With `METRICS_ENABLED=true` the backend exposes `GET /metrics` with `collectDefaultMetrics()` (process memory / GC / event-loop lag), an `http_request_duration_seconds` histogram labelled by `method` / matched-`route` / `status_code` (label cardinality bounded by using the route pattern, never the raw URL), and a `drawhaus_active_collaborators` gauge tracking live Socket.IO collaboration clients — the product's core value and main load driver. `/metrics` rides the public hostname (same `PORT`, behind kamal-proxy/Cloudflare) gated by a bearer token (`METRICS_TOKEN`), so a self-hosted Prometheus scrapes it like any external service and the setup survives a host migration with no network rewiring; in production the token is required (no token → 404, never unauthenticated exposure). Disabled by default — left off there's no endpoint and no instrumentation overhead. Adds `prom-client@^15.1.3`.
- **Node.js 24 (current LTS) unified across the toolchain.** Adds `.nvmrc=24` at the repo root; bumps `.devcontainer/devcontainer.json` and all three GitHub Actions workflows (`ci.yml`, `quality.yml`, `publish-mcp.yml`) from `node-version: 22` → `24`; adds `"engines": { "node": ">=24" }` to the root `package.json`, `apps/{backend,frontend}/package.json`, and all four `packages/*/package.json` (previously `>=18`). Application Dockerfiles (`apps/backend/Dockerfile`, `apps/frontend/Dockerfile`) were already on `node:24-slim` — no change there. The Dependabot PRs proposing Node 26 are deferred until Node 26 becomes Active LTS in October 2026.
- **`drawhaus-frontend` SonarQube project** scanned by `quality.yml` (`workflow_dispatch`). Adds `apps/frontend/sonar-project.properties` and a `Scan frontend` step alongside the existing backend scan. Frontend uses `sonar.javascript.skipTypechecking=true` and `sonar.javascript.node.maxspace=8192` to dodge the type-aware OOM caused by three.js/excalidraw/dagre type graphs — trading type-aware rules for a scan that completes. Packages remain unscanned for the same reason.

### Fixed

- **Excalidraw's canvas fonts are served by Drawhaus instead of esm.sh.** Excalidraw 0.18 loads Excalifont, Nunito, Lilita, Comic Shanns, Cascadia, Liberation, Virgil and the Xiaolai CJK subsets at runtime from `window.EXCALIDRAW_ASSET_PATH`, and falls back to `https://esm.sh/@excalidraw/excalidraw@<version>/dist/prod/` when it is unset. Drawhaus never set it, so every board open contacted a third-party CDN, and an offline or firewalled instance drew text in fallback fonts. The Vite build now copies the package's `dist/prod/fonts/` into `dist/excalidraw/fonts/` (13 MB, almost all Xiaolai subsets, each fetched only for characters on the board), the dev server serves the same files from `node_modules`, and `main.tsx` sets the asset path to `/excalidraw/` before anything imports Excalidraw. The frontend nginx now sends `Content-Security-Policy: font-src 'self' https://fonts.gstatic.com`, so fonts from any other host are refused; gstatic stays because `index.html` loads the UI fonts from Google Fonts. An E2E test opens a board with Excalifont text and asserts the font comes from the app's origin and nothing is requested from esm.sh.
- **Signed-out visitors can reach password recovery, workspace invitations and the legal pages again.** The axios 401 interceptor sent every signed-out visitor to `/login` from any path outside a hand-kept list (`/`, `/login`, `/register`, `/setup`, `/share`, `/embed`). `AuthProvider` asks for `/api/auth/me` on every page load, and that request answers 401 when signed out. So `/forgot-password`, `/reset-password/:token`, `/workspace-invite/:token`, `/privacy`, `/terms` and `/self-host` bounced to the login page, including the Terms and Privacy links in its own footer. Password recovery was broken for exactly the people who need it. The interceptor no longer knows any paths. It notifies `onUnauthorized` subscribers, and `ProtectedLayout` is the only subscriber: while mounted, it sends a 401 to `/login` with a full reload, which drops the stale user a mid-session expiry leaves in context. Nesting a route under `ProtectedLayout` in `router.tsx` is now the single place that makes it protected, both for the first render and for later 401s. A new page is public unless it is nested there. The six `test.fixme`s pinning this bug are real tests again. The forgot-password visual baseline, which was a screenshot of the login page, has been regenerated. At the suite's 5% pixel tolerance the login page still matched that baseline, so the visual test now asserts the "Reset your password" heading before comparing.
- **A board opens editable for its owner and editors, and viewers stay silent.** `BoardEditor` passed `canEdit: true` to the collaboration layer while the real role arrived later from `room-joined`, so every workspace viewer ran the editor save path and emitted `scene-delta` / `save-scene` frames (the server dropped them). `initialData` also started every board in view mode, and the effect meant to lift it ran once at mount, before the lazily loaded Excalidraw API existed, so owners and guest editors cold-loaded in view mode. The collaboration layer now derives `canEdit` from the role the room join grants (read-only until it answers), stops broadcasting and saving without it, `flushSave` included, and hands Excalidraw a `viewModeEnabled` prop (`!canEdit || following`), which Excalidraw applies at mount and on every change regardless of load order.
- **Guest editors now get interval snapshots and no longer reach Drive sync.** `save-scene` passed a guest's `guest_<socketId>` id as the interval snapshot's author, into the `diagram_snapshots.created_by` UUID column. Postgres rejected it (22P02) and the handler's `.catch(() => {})` swallowed the error, so boards edited only by guests never got an interval snapshot. The same id went to Drive sync, whose settings lookup failed the same way, and the Postgres error text reached the guest in `drive-sync-status`. A guest's save now records the snapshot with no author, as the close snapshot already did, and skips Drive sync; both handlers read the guest flag through one `accountUserId` helper. The tests never caught it because the in-memory snapshot and Drive backup fakes accepted any string; they now reject a non-UUID user id the way Postgres does.
- **Diagram listings filtered by folder but not by workspace are newest first again.** `GET /api/diagrams?folderId=…` without a `workspaceId` (a folder, or `null` for the root) used `SELECT DISTINCT ON (d.id) … ORDER BY d.id, d.updated_at DESC`. Its member join was not filtered by user, so `DISTINCT ON` was needed to drop the duplicate rows, and the result came back in UUID order. Every other listing is ordered by `updated_at DESC`. The branch now filters the member join by user and orders like the rest. The dashboard always sends a `workspaceId` and `/v1` always uses the key's workspace, so only direct API callers saw it. Found by the new Postgres tier.
- **Backend test runs can no longer hang CI.** #148 bounded `pg` connection attempts, yet CI still hung intermittently: #154's Validate job had every test passing and then sat until its 20-minute timeout, because the test process never exited. The job sets no `DATABASE_URL`, so the fallback read in `getBackupConfig` resolved the default host `db` through the runner's DNS, and a slow `EAI_AGAIN` left handles that kept the process alive — the blackhole-host reproduction behind #148 never exercised a DNS failure. The backend test scripts now point `DATABASE_URL` at `127.0.0.1:1`, which is refused immediately without DNS (no test uses a real database; integration tests stub `pool.query`). They also run with `--test-force-exit`, so a process with open handles still exits once its tests finish, and with `--test-timeout=30000`, so a test that genuinely waits fails by name instead of consuming the job. Locally this also stops the suite from reading the devcontainer's database.

- **Navigating from one board to another now mounts a fresh editor.** `/board/A` → `/board/B` reuses the same route element, and `Board` never reset its state on the id change: A's editor stayed on screen under B's URL until B loaded, then the same `BoardEditor` instance took B's props while keeping A's active scene id and canvas (Excalidraw reads `initialData` only at mount), so an early edit went to room B tagged with A's scene — which the backend now rejects as "Save failed". A failed load also left its "Diagram not found" over the next board, and a late response for A could replace B. `Board` now tags each load with the id it was for, shows "Loading..." until the current id's result arrives, ignores responses for a previous id, and keys `BoardEditor` by diagram id.
- **Excalidraw and Mermaid are out of the entry bundle again: 2964 KB → 439 KB (841 → 125 KB gzip).** The `lazy()` around `ExcalidrawCanvas` was defeated by a static chain — `router.tsx` → `Board` → `BoardEditor` → `BoardSidebar` → `CodeImportPanel` → `convert-to-excalidraw.ts` (static `@excalidraw/excalidraw` and `@drawhaus/mermaid-to-excalidraw`) and `mermaid-renderer.ts` (static `mermaid`) — so every page, the login screen included, downloaded the whole editor before rendering. Those modules now `import()` their libraries on first use (`plantumlToElements` becomes async), and the router lazy-loads `Board`, `Share`, `Embed` and `Settings` behind a `Suspense` that shows the existing full-screen "Loading..." screen, now a shared `PageLoading` component. Excalidraw ships in its own chunk, fetched only when a canvas mounts or a conversion runs.
- **An open tab now survives a deploy when it opens a lazy page.** A deploy replaces the hashed assets, so a dashboard left open across one failed to load the now-lazy `Board` chunk, and "Try again" could not recover because `React.lazy` keeps the failed import. A `vite:preloadError` listener now reloads the page once to pick up the new build. A timestamp in `sessionStorage` blocks another reload for 10 seconds, so a chunk that is genuinely missing shows the error screen instead of reloading forever; if `sessionStorage` is unavailable there is no loop protection, so it never reloads.
- **A crash outside the board no longer leaves a blank page.** Only `/board/:id` had an error boundary; a render error on any other route unmounted the whole app. `AppRouter` is now wrapped in the shared `ErrorBoundary` with a new `AppErrorFallback` (message, "Try again", link to the dashboard), reset whenever the path changes so navigating away recovers. The shared boundary now reports what it catches to Sentry: an error caught by a boundary never reaches Sentry's global handlers, so without it the root boundary would have hidden every render crash from monitoring — which the board's boundary already did.
- **A socket reconnect now joins the room once, not twice.** `useSocketConnection` called `joinRoom()` from both the socket's `connect` handler and the manager's `reconnect` handler, but socket.io-client fires `connect` on every reconnection too, so each reconnect sent two `join-room` events and the server answered each with a `scene-from-db` that replaces the canvas. The manager `reconnect` handler is gone — `connect` already set the state and cleared the error. The test socket mock now replays a reconnect in the real client's order (`reconnect`, then `connect`), and a test pins exactly one join per reconnect for both members and guests.
- **API and MCP content updates no longer vanish once a board has been opened.** `PATCH /api/diagrams/:id` and `PATCH /v1/diagrams/:id` wrote `diagrams.elements`, while `GET` reads the diagram's first scene, which is created the first time the board is opened and is what realtime saves write. After that point every content PATCH answered 200 and was never seen again. That includes MCP `update_diagram` and the frontend's REST save fallback when the socket is down. Content now goes to the first scene (created if missing), with the row kept as a mirror, in one transaction; a title-only PATCH leaves the scene alone, and replace semantics are unchanged. Duplicating a diagram and resolving a share link (share and embed pages) read the row too, so they served content behind the board; both now read the scene. See [ADR-025](docs/adr/025-first-scene-single-write-path.md). Open boards are not yet told about API writes.
- **Restoring a snapshot now aborts when the pre-restore backup fails.** `RestoreSnapshotUseCase` caught and logged a failed backup, then overwrote the scene anyway. A restore during a snapshot-store failure therefore destroyed the current content with nothing to go back to. The error now propagates, the request fails, and the scene is left as it was. The use case also stops importing the infrastructure logger, one of the application→infrastructure imports.
- **The backend now shuts down gracefully on deploy.** `main.ts` handled neither SIGTERM nor SIGINT. The image runs `node dist/main.js` as PID 1, and the kernel drops signals PID 1 has no handler for. So every Kamal `docker stop` waited out Docker's default 10s (Kamal passes no `-t` when kamal-proxy fronts the app) and then SIGKILLed the process, cutting sockets, the Postgres pool, Redis and the backup cron mid-flight. On the first signal the backend now closes things in order: Socket.IO (which also closes the HTTP server once in-flight requests finish), the backup cron, the Postgres pool, and Redis (shared client plus the adapter's pub/sub pair). It exits 0 when done. A failing step is logged and the rest still run; an 8s hard timeout, under Docker's 10s, or a second signal forces exit 1.
- **`pg` pool now bounds connection attempts, unhanging CI.** `new Pool()` was created without `connectionTimeoutMillis`, so an unreachable database host never settles the connect promise and its handles keep the Node process alive. In CI the backend suite finishes its tests and then sits there: run #147 reported every test green and still burned the job's 20-minute timeout, killed with `Terminate orphan process: npm run test`. It is intermittent because it depends on how the runner's DNS fails — a fast `ENOTFOUND` is harmless, a hanging resolver is not, which is why neighbouring PRs passed the same step in 22 seconds. Now 1s under `NODE_ENV=test`, 10s otherwise; the same gap would hang a production request waiting for a connection.
- **Docker image builds restored — deploys had been broken since 2026-06-27.** Two independent faults, both invisible to CI because `ci.yml` builds no images; the Dockerfiles are only exercised by `build-push.yml` on a push to `production`. The last successful deploy was 2026-06-24 and the next attempt failed the same day `packages/tsconfig.base.json` landed (`570f097`).
  - Neither Dockerfile copied `packages/tsconfig.base.json`, which all four `packages/*/tsconfig.json` extend, so the first `tsc` in the builder died with `TS5083: Cannot read file '/app/packages/tsconfig.base.json'`. Both images are affected, not just the backend.
  - `apps/frontend/Dockerfile` ran `rm package-lock.json && npm install`, building the image from a dependency tree nobody had tested. Without the lockfile npm installs TypeScript 6.0.3 at the root to satisfy `@typescript-eslint@8.70`'s peer range (`>=4.8.4 <6.1.0`); `apps/*` keep their own nested 5.9.3, but `tsup` is hoisted to the root and resolves TypeScript from there, so the dts build failed with `TS5101: Option 'baseUrl' is deprecated`. Switched to `npm ci`; the npm/cli#4828 optional-deps bug that motivated the fresh install no longer reproduces on npm 11 / Node 24, and both images now build clean from scratch.

### Security

- **Any signed-in user could read, and copy, any template by its id.** `GET /api/templates/:id` looked the template up with no access check, and `POST /api/templates/:id/use` copied the content of whatever template id it was given; #157 checked where the copy goes, not whether the caller may read the source. A pure policy in `domain/policies/template-policy.ts` now decides who may read a template: its creator, and, for a workspace template, any member of that workspace (any role, matching `GET /api/templates?workspaceId=`). `GetTemplate` and `UseTemplate` answer 404 to anyone else, so a template's existence stays hidden, and `UseTemplate` checks the source before creating anything. `UpdateTemplate`, `DeleteTemplate` and `TransferTemplateOwnership` still require the creator but now run the same check first, so a stranger gets 404 instead of a 403 that confirmed the id exists; a workspace member who is not the creator still gets 403. Deleting a workspace sets its templates' `workspace_id` to null, which leaves them to their creators alone. Built-in templates live in the frontend and are created as ordinary diagrams, so no database row depends on `is_built_in` for visibility.
- **Any signed-in user could create snapshots on any diagram.** `POST /api/diagrams/:id/snapshots` validated the id and the body but never checked whether the caller had access to the diagram. Knowing a board's UUID was enough to fill its 20 named-snapshot slots and broadcast `snapshot-created` to its room. The response carries no elements, so nothing leaked, but a stranger could flood a board's history. `CreateSnapshotUseCase` now has two entry points. `createManual` requires edit access, like restore, rename and delete: a stranger gets 404, so the board's existence stays hidden, and a viewer gets 403. `createAutomatic` accepts only the system triggers and keeps an optional actor, because the socket layer already gates those on room membership and `canEdit`, and a guest editor has no diagram role to check. The route's 429 branch is gone: manual snapshots were never deduplicated, so it could not fire.
- **A malformed socket event can no longer crash the backend.** Every socket handler destructured its payload in the parameter list, and socket.io runs listeners from `process.nextTick` with no process-level handler behind them, so a single `emit("cursor-move")` with no payload threw an uncaught `TypeError` and took the server down for every room; async handlers without their own `try/catch` (`request-viewport`, `disconnecting`) did the same through an unhandled rejection, and a `null` inside a `scene-delta` crashed the version check. All 16 client events now register through `onEvent(socket, event, schema, handler)`, which validates the payload with Zod before any handler logic and runs the handler inside a sync + async `try/catch`. An invalid payload is dropped and the sender gets a new `event-error` `{ event, message }` event — deliberately not `room-error`, which the frontend treats as a lost connection (see `docs/SOCKET_PROTOCOL.md`). Comment events now apply the same limits as their REST routes. Membership, rate-limit and `canEdit` checks are unchanged.
- **`save-scene` could overwrite a scene of any diagram (IDOR).** The handler checked `canEdit` for the room the client had joined, then persisted whatever `sceneId` the client sent, and the repository updated `WHERE id = $1` — so any editor of any board, including a guest holding an editor share link, could write elements into another diagram's scene by its id. `SaveSceneUseCase` now receives the room's diagram id, and `SceneRepository.updateSceneMerged(id, diagramId, …)` binds both in the `SELECT … FOR UPDATE` and the `UPDATE`; a foreign or unknown scene persists nothing and the sender gets the existing `room-error` "Save failed". The in-memory fake enforces the same binding. `comment-create` (socket and REST) accepted a `sceneId` from another diagram as well; `CreateCommentUseCase` now rejects it as not found. `scene-update` / `scene-delta` only use `sceneId` to pick a broadcast sub-room that is already namespaced by the joined `roomId`, so they need no binding.
- **Diagrams and templates could be placed in any workspace, and any workspace's templates listed.** `CreateDiagram`, `UseTemplate`, `CreateTemplate` and `ListTemplates.executeByWorkspace` passed the client's `workspaceId` / `folderId` straight to the repository: any signed-in user could drop a diagram or template into a workspace they don't belong to, where its members would see it, file it into a foreign folder, and read another workspace's templates, content included, through `GET /api/templates?workspaceId=`. The four use cases now check placement with a pure policy in `domain/policies/access-policy.ts` (the seed of a shared access-policy module): a workspace requires membership (any role, matching `CreateFolder` / `MoveDiagram`), personal content (`workspaceId` null) needs none, and a `folderId` must belong to the target workspace or, for personal content, to the user. Violations return `403`. `POST /v1/diagrams` goes through the same check with the API key's workspace, so a key whose owner has left the workspace can no longer create there.
- **Rate limits now apply per client, not per proxy.** Express had no `trust proxy`, and every request reaches the backend through cloudflared → kamal-proxy, so `req.ip` was kamal-proxy's address for everyone: the 5/min auth limiter and the 60/min API limiter behaved as site-wide buckets, and `log-api-request` recorded the same IP for every API call. The app now trusts exactly those two hops, and a test pins that an `X-Forwarded-For` entry a client prepends is ignored. With per-client keys in place, the three routes CodeQL flagged (`js/missing-rate-limiting`) for reaching the database before any limiter are covered: `/api/site/status` joins the general limiter, and `/health` and `/v1/health` get their own 120/min bucket, so a busy client can never starve kamal-proxy's healthcheck.

- **`qs` forced to 6.16.0 via `overrides`.** Both open advisories — GHSA-x5fp (array-limit bypass, `>=6.14.2 <=6.15.3`) and GHSA-4mjr (`isBuffer` DoS, `<6.16.0`) — are fixed only in 6.16.0, which `express@4.22.2`'s `~6.15.1` range cannot reach. `npm audit fix` "resolved" it by downgrading express to 4.22.1 and nesting `qs@6.14.2`, still inside both vulnerable ranges, so the override is the actual fix. 6.16.0's `parse` changes are limit-enforcement and `isBuffer` fixes with no default changes. `npm audit`: 14 → 12.

- **`normalizeText`'s actual ReDoS fixed** (`js/polynomial-redos`). #146 rewrote the `/\s{2,}/g` collapse in this function, but CodeQL's alert pointed at the chain's trailing `.replace(/^\n+|\n+$/g, "")` — an anchored alternation scanned globally, quadratic on input with many newlines. The chain now trims blank entries off the already-split line array, so no anchored regex runs over untrusted text. Behaviour is unchanged, verified across ten inputs and pinned with two more tests.
- **Three CodeQL regex findings fixed.** `sanitizeElements` used `/<[^>]*>/g` in a single pass: the ambiguous character class made it a polynomial-ReDoS target, and one pass is reversible — `<<a>script>alert(1)<</a>script>` came out as `script>alert(1)script>`, and merely tightening the class would have rebuilt a live `<script>`. It now uses `/<[^<>]*>/g` and repeats to a fixed point. `normalizeText` in `@drawhaus/helpers` collapsed whitespace with `/\s{2,}/g` (polynomial ReDoS) and now splits on `/\s+/`; one behaviour change, a lone tab is now collapsed to a space, which is what the function documents. `parseNodeContent` in the mindmap parser stripped regex anchors with `source.replace("^", "")`, which removes the _first_ caret in the string — for a pattern like `\w+[^,]+$` that is the negated class's caret, silently inverting it. Anchored replacements (`/^\^/`, `/\$$/`) are used instead; no current shape pattern was affected, so this one is preventive.
- **`@excalidraw/mermaid-to-excalidraw` upgraded 1.1.4 → 2.2.2**, collapsing two overlapping Dependabot PRs into one change. v1 depended on `mermaid@^10`, so the tree carried a second, older Mermaid copy (10.9.4) that pulled `dompurify@3.1.6`; v2 depends on `mermaid@^11.12.1`, which dedupes against the workspace's own 11.17.2 and removes both. `npm audit` drops from 16 to 14 findings (the `dompurify` and `mermaid` advisories are gone) and the install sheds 49 packages. Declared ranges bumped alongside: `mermaid` `^11.15.0` → `^11.16.1`, `dompurify` `^3.3.3` → `^3.4.13`. `parseMermaidToExcalidraw` keeps its signature in v2, so the fallback path in `packages/mermaid-to-excalidraw` needed no code change.
- **Admin use cases now self-authorize** (defense-in-depth). `AdminDeleteUserUseCase` / `AdminUpdateUserUseCase` load the actor and assert `role === "admin"` instead of trusting route middleware alone — a single missing route guard no longer escalates to user management.
- **Path params validated at the HTTP edge.** `validateParams` (UUID schema) extended from 3 route files to every id-bearing one (`comment`, `snapshot`, `tag`, `folder`, `template`, `api-key`, `share`, `workspace`); malformed ids previously only failed closed via a Postgres `22P02` catch. Opaque share/invite tokens are validated as non-empty strings, not forced to UUID.
- **Helmet defaults restored on the Express app** (CodeQL `js/insecure-helmet-configuration`). `contentSecurityPolicy` and `crossOriginEmbedderPolicy` were previously disabled; the JSON API + Redoc-stub static path do not require those opt-outs.
- **Drive ID validation tightened on `/api/drive` routes** (CodeQL `js/request-forgery`). `fileId` / `targetFolderId` / `folderId` now match `^[A-Za-z0-9_-]{10,128}$` via Zod before reaching the Google Drive `fetch` call, blocking path-traversal / special-char payloads.
- **Workflow permissions tightened** (CodeQL `actions/missing-workflow-permissions`). `ci.yml` and `quality.yml` now declare `permissions: contents: read` at workflow level; matches the existing convention in `build-push.yml` and `publish-mcp.yml`.

### Changed

- **Vite 7 → 8** (`vite`, `@vitejs/plugin-react` 5 → 6; frontend and both playgrounds). Vite 8 replaces esbuild/Rollup with Rolldown/Oxc for the production build and makes CommonJS default-import interop consistent between dev and build. The four CommonJS-only runtime dependencies the bundle default-imports (`socket.io-msgpack-parser`, `dagre`, `react`, `react-dom`) were checked by bundling a probe with each Vite version and running it: all resolve to the module object under both. With the Sentry plugin active, debug IDs land in all 162 JS chunks; 140 ship a valid sourcemap, and the 22 without one are 6 KB in total. Production build time drops from ~10.6 s to ~2.6 s, output 9.07 → 9.02 MB. Vite 8 also raises its default browser targets (Chrome/Edge 111, Firefox 114, Safari 16.4); no `build.target` is set here, so those now apply.

- **Vitest 4 → 5** (`vitest`, `@vitest/coverage-v8`, frontend only). No test or config changes were needed: none of v5's breaking patterns occur here (nested `vi.mock`/`vi.hoisted`, unawaited `resolves`/`rejects`, `toThrow("")`, removed `vitest/*` entry points), and 516/516 pass. Coverage matches master's CI artifact exactly — 118 files, 1812/3323 lines — so v5's stricter `include`/`exclude` matching left the hand-tuned denominator untouched. Vite stays on 7, which v5's peer range allows.

- **`node-cron` 3 → 4.** Closes the two `uuid` findings (`node-cron@3` depended on a vulnerable `uuid`). v4 ships its own types, so `@types/node-cron` is dropped and `ScheduledTask` becomes a named type import. `stopBackupScheduler` now calls `destroy()` instead of `stop()`: v4 keeps stopped tasks in a global registry, so every scheduler restart on a settings change would have left one behind. A new test checks that registry against real node-cron instead of a mock.

- **In-range dependency bumps.** `@sentry/node` / `@sentry/react` 10.74, `zod` 4.6.2 in the backend (`helpers` and `mcp` stay on zod 3), `resend` 6.27. `@sentry/bundler-plugins` moves to 10.74.0 alongside them: it pins `@sentry/core` exactly, and left at 10.73.0 it split the tree into eleven copies of `@sentry/core`. The root now declares `typescript: ~5.9.3` — a plain `npm update` re-resolves `@typescript-eslint`'s peer range (`<6.1.0`) to TypeScript 6.0.3 at the root, the condition that broke the frontend image's dts build fixed in #143.

- **`eslint-plugin-sonarjs` adopted and the easy backlog cleared.** The plugin rides `npm run lint` (SonarQube server stays the quality-gate source of truth) with firing rules parked at `off` and ratcheted on as their backlog is cleared. This pass re-enabled 11 rules across both workspaces: backend `prefer-regexp-exec`, `no-alphabetical-sort`, `deprecation` (Zod `ZodIssue` → `ZodError["issues"]`), `no-nested-template-literals`, `no-misleading-array-reverse`, `no-nested-conditional`; frontend `no-nested-conditional`, `no-all-duplicated-branches`, `no-duplicated-branches`, `no-trivial-assertions`, `no-nested-functions`. Still parked: backend `super-linear-regex` (real ReDoS hotspot — needs a careful fix) and frontend `prefer-specific-assertions` (18-finding backlog).
- **Raw SQL removed from the application layer** (Clean Architecture). `GetMetricsUseCase`, `InviteToWorkspaceUseCase`, `AcceptWorkspaceInviteUseCase`, and the `GET /workspaces/invite/:token` route handler queried Postgres directly; the SQL now lives behind two new ports — `MetricsRepository` and `WorkspaceInvitationRepository` (+ `Pg*` adapters) — fronted by a new `ResolveWorkspaceInviteUseCase`. Endpoint contract unchanged (`{ workspaceName, role, email }`; 404 used/not-found, 410 expired preserved).
- **OAuth and Drive HTTP extracted behind ports.** `GitHubAuthUseCase` / `GoogleAuthUseCase` no longer `fetch()` provider APIs directly — the HTTP moves to `GitHubOAuthProvider` / `GoogleOAuthProvider` adapters behind a new `OAuthProviderPort`; the four Drive use cases depend on a new `TokenRefresherPort` instead of the concrete refresher class. Use cases are now pure orchestration.
- **Use-case constructor deps made required.** Seven use cases had optional (`dep?:`) deps that could silently skip an auth/ownership check if unwired; all are now required and the dead `if (this.dep)` guards removed.
- **Package test suites now gate CI.** `ci.yml` runs `npm run test:packages` (helpers / mcp / plantuml / mermaid — ~500 tests) which previously ran only locally; the four packages now share a `packages/tsconfig.base.json`.
- **Frontend maintainability pass.** A `getErrorMessage` helper replaces 15 inline axios-error casts across 10 files; the `Diagram` type is sourced from a single `shared/DiagramTypes.ts` (was redefined inline in 5 files); `Settings.tsx` decomposed 450 → 233 lines into `ConnectedAccounts` / `DangerZone` / tab-config modules.
- **Backend `test:coverage` switched to `c8 --all`** (same approach as the frontend in v0.13 prep). The previous `node --experimental-test-coverage` only instrumented files imported by tests, so `lcov.info` listed 105 of 209 source files and reported 88% line coverage — a misleadingly high number. With `c8 --all`, lcov now lists all 187 source files (excluding `src/__tests__/**`, `src/migrations/**`, `src/domain/ports/**` interface-only files, and `*.d.ts`) and reports the honest ~20.7% line coverage. Adds `c8@^11.0.0` as a backend devDependency. SonarQube's previously reported 53.6% was likely averaging the two sets; expect Sonar to converge to the c8 number on the next workflow_dispatch.
- **Frontend tests now run with coverage in CI** and upload `lcov.info` as a 14-day artifact (`ci.yml`). Step swapped from `npm run test` to `npm run test:coverage --workspace=frontend`; the report is available for download from each run and sets up the eventual `drawhaus-frontend` Sonar project. The `test:coverage` script now uses `c8 --all` so untested files are reported as `0%` instead of being silently omitted — current frontend line coverage is ~0.85% across 130 source files (only `src/lib/` modules have tests).
- **CI Docker Hub login skipped for Dependabot PRs**. The `docker/login-action` step in `ci.yml` is now gated by `if: github.actor != 'dependabot[bot]'`. Dependabot lacks access to `secrets.DOCKERHUB_TOKEN`, so the unconditional login was failing the `Validate` job on every Dependabot PR and blocking dependency review.
- **Error monitoring migrated from Honeybadger to Sentry** ([ADR-023](docs/adr/023-sentry-error-monitoring.md)). Backend now uses `@sentry/node` (`Sentry.captureException` + `setupExpressErrorHandler`); frontend ships `@sentry/react` initialized at boot and `@sentry/vite-plugin` for source-map upload at build time. Both are gated by env vars and stay disabled when DSNs are absent.
- **Deploy env vars split into `vars` vs `secrets` in the GitHub `production` environment**. Repo-level secrets are now limited to `SSH_PRIVATE_KEY` and `DOCKERHUB_TOKEN`; everything else lives in the environment. Adds `SENTRY_*`, `VITE_SENTRY_*`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

### Removed

- **`dompurify` and `@types/dompurify` dropped from `apps/frontend`.** Neither was imported anywhere in the frontend — the declared `^3.3.3` range mirrored what `mermaid` already depends on, and `@types/dompurify` is a deprecated stub (DOMPurify has shipped its own types since 3.2). Removing them changes nothing at runtime: `dompurify` stays at 3.4.15 in the tree via `mermaid@11.17.2` (`^3.3.3`), and `npm audit` is unchanged at 14 findings.
- `@honeybadger-io/js` dependency and the `HONEYBADGER_API_KEY` env var.

---

## v0.12.0 — Concurrent Editing & Redis Shared State (2026-03)

### Added

- **Concurrent multi-user editing** — multiple users can edit the same diagram simultaneously ([ADR-022](docs/adr/022-concurrent-editing-over-lock.md)). Replaces the single-editor global lock
- **Delta updates** — `scene-delta` socket event sends only changed/removed elements instead of full state (~80% payload reduction)
- **Server-side merge** — `save-scene` uses `SELECT ... FOR UPDATE` transactions to merge elements by version, preventing data loss on concurrent saves
- **Conflict toasts** — users are notified when their edits are overwritten or elements they were editing are deleted by another user
- **Orphan cleanup** — arrow bindings and group memberships are automatically cleaned up when referenced elements are deleted
- **Shared merge utilities** — `mergeElements`, `mergeDelta`, `diffElements` in `@drawhaus/helpers`, shared between frontend and backend
- **Raise hand signaling** — lightweight socket events for requesting attention during collaboration, not tied to editing
- **Redis shared state** — rate limiting, snapshot interval dedup now use Redis when `REDIS_URL` is available ([ADR-021](docs/adr/021-redis-shared-state.md))
- **Shared Redis client** — single `ioredis` instance reused across rate limiters and snapshot dedup to minimize connections
- **`rate-limit-redis`** — HTTP and API rate limiters automatically upgrade to Redis-backed store for cross-instance consistency
- **Security validation** — server rejects deltas that remove >50% of elements or have version jumps >100k

### Changed

- `EditLockOverlay` replaced by simplified `CollaborationBadge` (raise hand only)
- `useSaveManager` emits `scene-delta` instead of `scene-update` for incremental changes
- `SaveSceneUseCase` uses `updateSceneMerged` (PostgreSQL transaction) instead of direct overwrite
- View mode no longer depends on edit lock — all editors can edit simultaneously
- Snapshot interval tracking uses `SET NX EX` in Redis for cross-instance dedup, falls back to in-memory `Map`

### Removed

- `EditLockStore` — global lock replaced by concurrent editing with element-level merge
- Lock countdown timer, queue position UI, and "Pedir turno" CTA

---

## v0.11.0 — Public API, MCP Server & GitHub OAuth (2026-03)

### Added

- **GitHub OAuth** — sign up and log in with GitHub. Automatic account linking by email prevents duplicate accounts across Google, GitHub, and email/password
- **Connected Accounts** — Settings → Security now shows linked OAuth providers with Connect/Disconnect buttons. Cannot disconnect the last sign-in method
- **OAuth account linking** — `GET /api/auth/link/google`, `GET /api/auth/link/github` to link accounts from settings; `DELETE /api/auth/link/:provider` to unlink
- **API key management** — create, list, and revoke workspace-scoped API keys (`dhk_` prefix) from Settings → API Keys
- **Public API `/v1/`** — REST endpoints for diagrams (create, list, get, update, delete) authenticated via API keys
- **`/v1/health`** — unauthenticated health check endpoint for connectivity verification
- **Element sanitization** — HTML tag stripping on text fields to prevent stored XSS via API
- **`created_via` tracking** — diagrams record whether they were created via UI or API
- **SDK header requirement** — `X-Drawhaus-Client` header required for API requests (client identification)
- **API rate limiting** — 60 requests/minute per API key
- **Request logging** — API requests logged with method, path, status, and response time
- **OpenAPI 3.1 spec** — machine-readable API documentation at `docs/openapi.yaml`
- **Redocly integration** — `npm run docs:lint`, `docs:build`, `docs:preview` for API documentation
- **MCP server package** — `@drawhaus/mcp` enables AI tools (Claude Code, Cursor, VS Code) to create and manage diagrams via Model Context Protocol
- **5 MCP tools** — `create_diagram`, `list_diagrams`, `get_diagram`, `update_diagram`, `delete_diagram`
- **2 MCP resources** — `drawhaus://diagrams` (list) and `drawhaus://diagrams/{id}` (detail)
- **4 MCP prompts** — `db_schema_diagram`, `class_diagram`, `sequence_diagram`, `architecture_diagram` with Excalidraw generation instructions
- **Drawhaus HTTP client** — lightweight fetch-based client with automatic auth headers and human-readable error messages
- **Zod input validation** — all MCP tool inputs validated before API calls
- **Health check on startup** — MCP server verifies Drawhaus connectivity before exposing tools
- **`@drawhaus/helpers` package** — shared element builders, layout engine, validator, and curated spec for Excalidraw diagram generation
- **Element builders** — `createRect()`, `createText()`, `createArrow()`, `createLine()`, `createDiamond()`, `createEllipse()` with sensible defaults
- **Layout engine** — dagre-based automatic graph layout with configurable direction (TB/LR) and spacing
- **Arrow routing** — `clampToBoxBorder()` and `buildArrowPoints()` for intelligent edge routing
- **Element validator** — `validateElements()` with limits on coordinates, dimensions, element count, text length, and dangerous key rejection
- **Curated spec** — `getSpecForPrompt()` generates LLM-friendly Excalidraw element documentation with per-diagram-type recommended styles
- **Diagram styles** — predefined color palettes for DB schema, class, sequence, and architecture diagrams
- **MCP `validate_elements` tool** — pre-validate elements before creating diagrams, with actionable error messages
- **MCP prompt improvements** — prompts now include full curated spec with field docs, examples, and recommended styles
- **Defense in depth** — element validation in MCP (client-side) and backend `/v1/` routes (server-side)

- **"Created via" badge** — diagrams created via API or MCP show a subtle badge in the dashboard card and board editor title bar
- **MCP origin tracking** — diagrams created via MCP server are now tracked as `created_via: "mcp"` (distinct from generic API)
- **API metrics in admin dashboard** — new cards showing diagrams created via API/MCP and API request count (last 24h)
- **MCP setup guide** — comprehensive user guide at `docs/guides/mcp-setup.md` covering all supported AI tools, example workflows, and troubleshooting
- **Custom Mermaid converter in frontend** — frontend now uses `@drawhaus/mermaid-to-excalidraw` with custom converters for flowchart, sequence, class, state, ER, and mindmap diagrams

### Changed

- **Frontend PlantUML converter** — layout engine and arrow routing now imported from `@drawhaus/helpers` shared package
- **MCP `create_diagram` / `update_diagram`** — validate elements before sending to API, return descriptive errors

---

## v0.10.0 — Snapshots, Editor Lock & Single-Scene (2026-03)

### Added

- **Persistent snapshot system** — auto-triggered snapshots (on save, on join, periodically) with full REST API for listing, creating, restoring, renaming, and deleting snapshots
- **Snapshot panel UI** — sidebar panel to browse, preview, restore, and rename snapshots with offline recovery support
- **Snapshot preview modal** — visual preview with restore and rename actions directly from the modal
- **Snapshot count badge** — dashboard diagram cards show named snapshot count; "Open as new diagram" action from snapshots
- **Real-time snapshot sync** — broadcast `snapshot-created` events to keep the snapshot panel in sync across users; notify active users when a snapshot is restored
- **Editor lock system** — single-writer collaborative editing with lock acquisition, release on inactivity, and automatic reassignment on disconnect
- **Canvas settings panel** — grid toggle and background color controls with separated canvas preferences from shared appState
- **Object snapping** — enabled Excalidraw snapping for better element alignment
- **Move-to-workspace** — duplicate diagrams preserve workspace; move diagrams between workspaces
- **Database migrations** — adopted `node-pg-migrate` for versioned, repeatable database migrations
- **Gitleaks pre-commit hook** — prevents accidental secret commits

### Improved

- **Collaboration stability** — stabilized follow mode, reduced jank, locked viewport/editing while following
- **Canvas data loading** — server data prioritized over stale localStorage cache; first scene data loaded in initial API response to prevent visual jump
- **Collaboration merge** — preserved element order during real-time merge
- **Socket reconnection** — automatic reconnection with room re-join on recovery; grace period for reconnection added

### Removed

- **Multi-scene support** — removed scene tabs, multi-scene API endpoints, and related UI in favor of single-scene diagrams

### Fixed

- **Edit lock UX** — canvas starts in view-only mode until lock is confirmed; pan/zoom allowed when another user holds the lock; hidden redundant "Tienes el control" bubble for self lock; guarded socket callbacks against React Strict Mode cleanup
- **Snapshot noise** — content hash deduplication, cross-trigger dedup, 5-minute grace period before offline snapshots
- **Preview modal** — prevented preview modal from closing the sidebar on restore
- **Setup flow** — fixed setup-lock cache bug and added UUID parameter validation
- **CI** — fixed lint errors and e2e backend startup failure

---

## v0.9.0 — Templates, Diagram as Code & Self-Hosted Frontend (2026-03)

### Added

- **Self-hosted frontend deployment** — frontend deploys as a Kamal service (nginx container) alongside the backend on the same server, removing the dependency on Cloudflare Pages. Both services deploy sequentially via GitHub Actions with the backend health check as a gate
- **Frontend production Dockerfile** — multi-stage build with nginx serving the SPA, gzip compression, and immutable cache headers for Vite hashed assets
- **PlantUML class diagram import** — parse PlantUML class diagrams and convert to editable Excalidraw elements on the canvas
- **Diagram as Code — Mermaid Live Import** — "Import from Code" panel in the board sidebar. Paste Mermaid code, see a live SVG preview, and add editable Excalidraw elements to the canvas. Supports flowcharts, sequence diagrams, class diagrams, and all Mermaid diagram types
- **Template system** — create new diagrams from built-in or custom templates
- **7 built-in developer templates**: System Architecture, ER Diagram, Sequence Diagram, Sprint Retro Board, ADR Visual, API Flow, User Flow
- **Custom templates** — save any diagram as a reusable template from the board sidebar
- **Template Picker modal** — replaces blank "New Diagram" flow with categorized template selection (Architecture, Database, Agile, Process)
- **Template API** — full CRUD for custom templates plus `POST /api/templates/:id/use` to create diagrams from templates
- **Usage tracking** — templates track how many times they've been used
- **My Templates dashboard view** — dedicated "My Templates" nav item in dashboard sidebar with grid of template cards (thumbnail, category badge, scope label, usage count, inline rename, delete, use)
- **Workspace template sharing** — "Share with [Workspace Name]" checkbox when saving templates; scope badge shows workspace name in My Templates view
- **Workspace ownership transfer** — owners can transfer workspace ownership to any admin member, with optional bulk transfer of diagrams and templates
- **Diagram ownership transfer** — bulk transfer diagram ownership to another workspace member via `POST /api/diagrams/transfer-ownership`
- **Template ownership transfer** — bulk transfer template ownership to another workspace member via `POST /api/templates/transfer-ownership`
- **Delete account guard** — users who own shared workspaces must transfer ownership before deleting their account (409 Conflict with workspace list)
- **Transfer Ownership UI** — new section in Workspace Settings with admin selector, resource transfer checkbox, and confirmation flow
- **Reusable SidebarDrawer** — extracted inline drawer component with outside-click/Escape handling and dynamic width per panel type
- **Sidebar UX redesign** — buttons reorganized into semantic groups (Create & Import, View & Collaborate, Save, Navigation)
- **Docker-in-Docker devcontainer feature** — enables running Kamal deploy commands from the devcontainer

### Improved

- **Landing page redesign** — stacked screenshots showing code import + template picker in the Developer section; realistic screenshots with populated dashboards and thumbnails
- **Marketing screenshots** — automated Playwright script generates 7 screenshots (hero, dashboard, admin, code-import, templates, share, collab) with demo data, fake cursors, and proper auth contexts
- **Excalidraw UI cleanup** — hidden redundant canvas actions (library, export, save-as-image, load scene, save-to-file)

### Fixed

- **Cookie `sameSite` policy** — production cookies now use `sameSite: "lax"` (more secure) for same-origin deployments; `"none"` is only used when `COOKIE_DOMAIN` is set (cross-subdomain setups)
- **SceneTabBar restored** — floating tab bar for scene switching was accidentally removed in a prior refactor; now back at bottom-left of canvas
- **Template listing bug** — `findByCreator()` excluded workspace-associated templates due to `AND workspace_id IS NULL` filter; templates now visible regardless of workspace association
- **TypeScript build errors** — resolved type errors for Docker production builds

---

## v0.8.0 — Security, Testing & Architecture (2026-03)

### Added

- **Maintenance mode** for site-wide access control during deployments
- **Security headers** via Helmet (X-Frame-Options, HSTS, X-Content-Type-Options, CSP)
- **Rate limiting** on auth endpoints (5 req/min) and general API (20 req/min) via `express-rate-limit`
- **Setup lock** middleware — redirects all routes to `/setup` until initial admin is created
- **3-step setup wizard** with progress bar: admin account → instance config → integrations (optional)
- **Setup banner** on dashboard when optional setup steps are skipped
- **Integration secrets in DB** — Google OAuth and Resend keys stored encrypted (AES-256-GCM), editable from admin UI
- **Structured audit logger** for security-sensitive operations (login, role changes, deletions)
- **React Error Boundary** around BoardEditor to catch rendering crashes gracefully
- **Improved `/health` endpoint** — verifies DB connection, reports app version and uptime
- **`GET /api/version`** — returns version, commit hash, and deploy date
- **Automated database backups** via `node-cron` with schedule, retention, and enable/disable configurable from admin panel and setup wizard
- **On-demand backup/restore CLI** — `npm run db:backup` and `npm run db:restore` commands
- **Admin backup API** — `GET /api/admin/backups` and `POST /api/admin/backups/trigger`
- **Redis adapter** for Socket.IO horizontal scaling across multiple containers
- **`withTransaction` helper** for atomic multi-step DB operations (e.g. workspace creation)
- **Comprehensive Playwright E2E suite** — 5-phase rollout: permission boundaries, CRUD, sharing, auth flows, visual regression
- **Smoke tests** covering critical user flows (health, login, create diagram, share, search, admin, setup)
- **LICENSE**, **CONTRIBUTING**, and **SECURITY** documentation files

### Improved

- **Backend architecture**: extracted composition root into separate repositories, services, and use-cases modules
- **Validation**: extracted `validate()` middleware, deduplicated Zod schema parsing across 11 route files
- **Authorization**: extracted `requireAccess` helpers, deduplicated permission checks across 21 use cases
- **Frontend hooks**: split `useCollaboration` into `useSocketConnection`, `useSaveManager`, `usePresence`, `useSceneManager`
- **Frontend components**: split large components and extracted shared types into dedicated modules
- **Frontend hooks directory**: consolidated all hooks into single `lib/hooks/` directory
- **Axios layer**: added response interceptor, removed 59 manual `.then(r => r.data)` calls
- First user registration auto-completes setup (`setup_completed = true`)
- Rate limiting disabled in test environment to prevent flaky e2e tests
- Raised Express JSON body limit to 5 MB for large diagram imports
- E2E test isolation: unique test users per domain to eliminate flakiness

### Fixed

- **Security**: Drive GraphQL injection, folder authorization bypass, cookie deduplication
- Stabilized e2e tests and hardened setup flow
- Resolved e2e test timing issues and improved test resilience

### Environment Variables (new)

- `ENCRYPTION_KEY` — 32-byte hex key for encrypting integration secrets
- `REDIS_URL` — Redis connection string for Socket.IO scaling
- `BACKUP_PATH` — Backup storage directory (default: `/data/backups`)
- `BACKUP_ENABLED`, `BACKUP_CRON`, `BACKUP_RETENTION_DAYS` moved to admin panel (Settings → Database Backups) with env var fallback

---

## v0.7.0 — Workspaces, Drive & Dashboard Overhaul (2026-03)

### Added

- **Google Drive integration**: OAuth scope upgrade, export/import diagrams to/from Drive, auto-backup on save, integrations tab with sync badge
- **Google OAuth login** with account linking
- **Multi-tenant workspaces**: personal workspace per user, workspace CRUD (name, description, color, icon), roles (admin/editor/viewer), member invites with email accept flow
- **Workspace-scoped folders and diagrams** with `findAccessRole` access control (owner > diagram member > workspace member)
- **Dashboard sidebar**: workspace switcher with settings cog, workspace settings page (identity, members, danger zone)
- **Admin-configurable limits**: max 5 workspaces/user, max 5 members/workspace
- **Dashboard UX overhaul**: Recent as default landing view, cross-workspace Recent/Starred views, workspace-scoped toolbar (New Diagram, New Folder, Import, Drive, grid/list toggle)
- **Folder sections**: folders rendered as content sections sorted alphabetically, per-folder diagram creation, "Uncategorized" section, folder deletion with non-empty guard
- **Category tags**: full CRUD API + assign/unassign to diagrams
- **Account deletion** with password confirmation and cascade
- **Comment reactions** (likes) with toggle
- **Board collapsible sidebar**: slim icon bar + expandable panels
- **Admin delete user** with confirmation modal
- **Embeddable link support** for diagrams
- **Toast notification system**: `useToast()` hook with success, error, and info variants
- **Confirm dialog system**: `useConfirm()` hook with promise-based API and danger variant
- **Production migration script** for existing data normalization to workspaces
- **Style guide**: documented Toast, ConfirmDialog, Drawer, Theme Toggle, Color Picker, Connection Badges with categorized TOC

### Improved

- Replaced all `window.confirm()` and `window.alert()` with polished UI dialogs
- Success/error feedback on all destructive actions across Dashboard, WorkspaceSettings, and AdminUsers
- Refactored Dashboard.tsx into reusable components: DashboardSidebar, WorkspaceToolbar, WorkspaceView, GeneralView, FolderSection, DiagramGrid, NewDiagramCard
- Removed "All Diagrams" nav — Recent/Starred are now read-only global views
- Moved Invite User button from admin overview to users page
- Added `.env.example` and wired docker-compose to use `.env`

### Fixed

- Google OAuth secrets missing from Kamal deploy config
- Unhandled errors not reported to Honeybadger from async route handlers
- ESLint errors and warnings cleanup
- Workspace SQL bug in dashboard queries

---

## v0.6.0 — Design Stitch & Polish (2026-03)

### Added

- Dark/light theme toggle with persistent ThemeContext
- Full UI redesign for auth pages, settings, admin panel, dashboard, and board toolbar
- Landing page: hero section, features grid, CTA, footer with branding
- Dashboard: starred diagrams, grid/list view toggle, recent sidebar, diagram duplicate, inline rename
- Share modal: role selector, expiration (days), copy link, revoke individual/all links
- Comments: tab filtering (Open/Resolved/All), threaded replies, resolve/unresolve workflow, scene-scoped
- Guest join: enhanced design with session preview, live badge, role indicator, branding footer
- Admin: invite user flow with Resend email, metric cards with decorative shapes, toggle switches
- Forgot password flow: reset token generation, email via Resend, `/forgot-password` and `/reset-password/:token` routes
- Privacy and Terms pages with footer links
- Board toolbar: 2-row layout, icon buttons, inline title editing
- Bauhaus-inspired branding: logo, brand guide, design tokens, favicon
- Tags backend: CRUD API, assign/unassign to diagrams
- First-time `/setup` page for admin user creation
- Honeybadger error monitoring integration

### Improved

- WebSocket performance: msgpack binary encoding, adaptive throttle, compression
- Frontend audit: extracted components, deduplicated code, optimized renders
- Share links: enforced max 20 per diagram, removed invalid commenter role
- Sidebar: consolidated admin link into settings, added logout button

### Fixed

- Scene switching content loss and cross-scene save race condition
- Auth redirect loop and user data unwrapping
- DB migration order for scene_id indexes
- Kamal deploy: SSH user, Resend env vars, batch mode

---

## v0.5.0 — Vite Migration (2026-02)

### Added

- Vite + React Router SPA replacing Next.js
- Axios API layer with typed endpoint modules and 401 interceptor
- Backend CORS support with cross-origin cookie handling
- Cloudflare Pages SPA redirect for client-side routing
- `COOKIE_DOMAIN` env var for subdomain cookie sharing

### Removed

- Next.js and all related dependencies (`next`, `eslint-config-next`)
- Next.js App Router directory (`frontend/app/`)
- Frontend Docker production stage (now static-hosted)

---

## v0.4.0 — Team Experience (2026-02)

### Added

- Folders: flat folder structure with sidebar navigation
- Full-text search on diagram titles
- Multi-scene support: tab bar, per-scene collaboration, scene switching
- Auto-generated diagram thumbnails on save
- Comments backend: threads, replies, resolve, real-time via Socket.IO
- Comments UI: panel, element indicators, real-time updates

### Fixed

- Scene switching loses content and cross-scene save race condition

---

## v0.3.0 — Table Stakes (2026-01)

### Added

- Export to PNG/SVG via Excalidraw APIs
- Import `.excalidraw` JSON files
- Read-only embed links (`/embed/:token`)
- Structured logging with pino and request ID propagation
- User settings: profile editing (name, email), password change
- Admin panel: metrics cards, user table with disable/enable, registration toggle
- Brand guide with logo assets, colors, and favicon

---

## v0.2.0 — Collaboration & Deployment (2026-01)

### Added

- Real-time collaboration via Socket.IO with room lifecycle
- Live presence: cursors, user list, viewport follow
- Share links with roles (editor/viewer) and expiration
- Guest access via share tokens with name persistence
- Follow mode and floating toolbar
- Permission enforcement on sockets and API routes
- Production deployment via Kamal + Cloudflare Tunnel
- Clean Architecture refactor (backend)
- DevContainer setup with PostgreSQL

### Fixed

- Element-level merge to prevent rollbacks
- Guest scene loading and appState sync issues

---

## v0.1.0 — MVP (2025-12)

### Added

- Full Excalidraw editor integration
- Auth: register, login, logout with cookie sessions
- Diagram CRUD with JSONB storage and access control
- Auto-save on canvas changes
- Protected dashboard and board pages
- Monorepo structure (frontend + backend workspaces)
- GitHub Actions CI pipeline
- Docker Compose local dev stack
