# Changelog

All notable changes to Drawhaus are documented here.

---

## v0.13.0 — Drawhaus Helpers (2026-03)

### Added
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

### Changed
- **Frontend PlantUML converter** — layout engine and arrow routing now imported from `@drawhaus/helpers` shared package
- **MCP `create_diagram` / `update_diagram`** — validate elements before sending to API, return descriptive errors

---

## v0.12.0 — MCP Server (2026-03)

### Added
- **MCP server package** — `@drawhaus/mcp` enables AI tools (Claude Code, Cursor, VS Code) to create and manage diagrams via Model Context Protocol
- **5 MCP tools** — `create_diagram`, `list_diagrams`, `get_diagram`, `update_diagram`, `delete_diagram`
- **2 MCP resources** — `drawhaus://diagrams` (list) and `drawhaus://diagrams/{id}` (detail)
- **4 MCP prompts** — `db_schema_diagram`, `class_diagram`, `sequence_diagram`, `architecture_diagram` with Excalidraw generation instructions
- **Drawhaus HTTP client** — lightweight fetch-based client with automatic auth headers and human-readable error messages
- **Zod input validation** — all MCP tool inputs validated before API calls
- **Health check on startup** — MCP server verifies Drawhaus connectivity before exposing tools

---

## v0.11.0 — Public API & API Keys (2026-03)

### Added
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
- **Integration secrets in DB** — Google OAuth, Resend, Honeybadger keys stored encrypted (AES-256-GCM), editable from admin UI
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
