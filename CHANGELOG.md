# Changelog

All notable changes to Drawhaus are documented here.

---

## v0.9.0 — Developer Templates (2026-03)

### Added
- **Template system** — create new diagrams from built-in or custom templates
- **7 built-in developer templates**: System Architecture, ER Diagram, Sequence Diagram, Sprint Retro Board, ADR Visual, API Flow, User Flow
- **Custom templates** — save any diagram as a reusable template from the board sidebar
- **Template Picker modal** — replaces blank "New Diagram" flow with categorized template selection (Architecture, Database, Agile, Process)
- **Template API** — full CRUD for custom templates plus `POST /api/templates/:id/use` to create diagrams from templates
- **Usage tracking** — templates track how many times they've been used

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
