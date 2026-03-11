# Drawhaus Roadmap

> Self-hosted Excalidraw alternative — your whiteboard, on your server.

---

## What's Been Built (v0.1–v0.7)

Everything below is shipped and working in production.

### Core (v0.1–v0.2)
- Full Excalidraw editor with real-time collaboration (Socket.IO)
- Auth: register, login, logout, session management
- Diagram CRUD with auto-save (JSONB in Postgres)
- Live presence: cursors, user list, viewport follow
- Share links with roles (editor/viewer) and expiration
- Guest access via share tokens
- Permission enforcement on sockets and API
- Production deployment: Kamal + Cloudflare Tunnel

### Phase 1 — Table Stakes (v0.3)
- Export PNG/SVG via Excalidraw APIs
- Import `.excalidraw` files
- Read-only embed links (`/embed/:token`)
- Structured logging (pino + request IDs)
- User settings: profile editing, password change
- Admin panel: metrics, user management, registration toggle

### Phase 2 — Team Experience (v0.4)
- Folders with sidebar navigation
- Full-text search on diagram titles
- Multi-scene support with tab bar and per-scene collaboration
- Auto-generated diagram thumbnails on save

### Phase 3 — Vite Migration (v0.5)
- Replaced Next.js with Vite + React Router + Axios
- Backend CORS + cross-origin cookie support
- Static SPA deployed via Cloudflare Pages
- Removed all Next.js dependencies

### Design Stitch & Polish (v0.6)
- Dark/light theme toggle with ThemeContext
- Full UI redesign: auth pages, settings, admin, dashboard, board toolbar
- Landing page with hero, features grid, CTA, footer
- Dashboard: starred diagrams, grid/list toggle, recent sidebar, duplicate, inline rename
- Share modal: role selector, expiration in days, copy link, revoke links
- Comments: tabs (Open/Resolved/All), threaded replies, resolve workflow, scene-scoped
- Guest join: enhanced design with session preview, role badge, branding
- Admin: invite user flow with email (Resend), metric cards, toggle switches
- Forgot password flow with reset tokens and email
- Board toolbar: 2-row layout, icon buttons, inline title editing
- Branding: Bauhaus-inspired logo, brand guide, fonts, favicon
- Performance: msgpack binary encoding, adaptive throttle, WebSocket compression
- Honeybadger error monitoring
- First-time `/setup` page for admin creation

### Google Drive Integration (v0.7)
- Google OAuth login with account linking
- OAuth scope upgrade flow for Drive API
- Export diagrams to Google Drive
- Import `.excalidraw` files from Google Drive
- Auto-backup to Drive on save
- Integrations tab in settings with sync badge

### Remaining Stitch Items (v0.7)
- Category tags: full CRUD API + UI
- Account deletion with password confirmation and cascade
- Comment reactions (likes) with toggle
- Board collapsible sidebar: slim icon bar + expandable panels
- Admin delete user with confirmation modal
- Embeddable link support for diagrams

### Workspaces (v0.7)
- Multi-tenant workspace support for separating diagrams by client/project
- Personal workspace auto-created per user (can't be deleted or shared)
- Workspace CRUD: name, description, color, emoji/text icon
- Workspace roles: admin (full control), editor (edit diagrams), viewer (read-only)
- Member management: invite by email, accept flow with login/register redirect
- Workspace-scoped folders and diagrams
- Access control: `findAccessRole` checks owner > diagram member > workspace member
- Dashboard sidebar: workspace switcher with settings cog per workspace
- Workspace settings page: identity, members list with role dropdown, danger zone
- Admin-configurable limits: max 5 workspaces per user, max 5 members per workspace
- Production migration: standalone SQL script for existing data normalization

### Dashboard UX Overhaul (v0.7)
- Removed "All Diagrams" nav — Recent is now the default landing view
- Recent and Starred fetch diagrams across all workspaces (cross-workspace global views)
- Recent/Starred are read-only views (no create CTAs)
- Workspace-scoped toolbar: New Diagram, New Folder, Import, Drive, grid/list toggle
- Folders rendered as content sections (not sidebar items), sorted alphabetically
- Per-folder diagram creation via inline action button
- "Uncategorized" section for diagrams not in any folder
- Folder deletion with non-empty guard (blocking alert)
- Always-visible folder action buttons (create diagram, delete)
- Refactored Dashboard.tsx into reusable components: DashboardSidebar, WorkspaceToolbar, WorkspaceView, GeneralView, FolderSection, DiagramGrid, NewDiagramCard

### Feedback & Notification System (v0.7)
- Toast notification system: `useToast()` hook with success, error, and info variants
- Confirm dialog system: `useConfirm()` hook with promise-based API and danger variant
- Replaced all `window.confirm()` (4) and `window.alert()` (1) with polished UI dialogs
- Success feedback on all destructive actions (delete diagram, folder, workspace, user, member)
- Error feedback on failed operations instead of silent catches
- Consistent design across Dashboard, WorkspaceSettings, and AdminUsers
- Admin delete user modal replaced with shared ConfirmDialog
- Style guide: documented Toast, ConfirmDialog, Drawer, Theme Toggle, Color Picker, Connection Badges
- Style guide: categorized table of contents with anchor navigation

---

## What's Next

- Backup All to Google Drive: bulk sync all diagrams in active workspace to Drive with folder structure and real-time progress (POST returning 202, socket.io progress events, concurrency limit of 3).

### v1.0 Gate — Security Hardening

> Must-fix before release. Identified by expert panel security audit.

| # | Item | Priority | Effort | Description |
|---|------|----------|--------|-------------|
| 1 | Rate limiting | Must | S | `express-rate-limit` on login, register, password reset, setup. 5 req/min auth, 20/min general |
| 2 | Helmet security headers | Must | S | `app.use(helmet())` — X-Frame-Options, HSTS, X-Content-Type-Options, basic CSP |
| 3 | Setup lock | Must | S | `setup_completed` flag in `site_settings`; redirect all routes to `/setup` until complete |

### v1.0 Gate — Setup Wizard

> Replace current bare `/setup` page with a guided 3-step wizard.

| Step | What it does | Backend |
|------|-------------|---------|
| 1 — Admin account | Create admin user (already exists) | Reuse `/api/auth/register` with auto-admin role |
| 2 — Instance config | Instance name, registration open/closed | Reuse `PUT /api/admin/settings` |
| 3 — Integrations (optional) | Google OAuth, Resend API key, Honeybadger | New `PUT /api/admin/integrations` endpoint |

- Skippable step 3 — never block first use for optional integrations
- On completion, set `setup_completed = true`
- Dashboard shows persistent "Finish setup" banner if optional steps were skipped

### v1.0 Gate — Integration Secrets in DB

> Move feature-level API keys from env vars to encrypted DB storage, editable from admin UI.

**Moves to DB (encrypted):**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `RESEND_API_KEY`, `FROM_EMAIL`
- `HONEYBADGER_API_KEY`

**Stays in env vars (infra — required to boot):**
- `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY`
- `PORT`, `FRONTEND_URL`, `COOKIE_DOMAIN`, `NODE_ENV`

**Implementation:**
- New table `integration_secrets (key TEXT PK, encrypted_value TEXT, updated_at TIMESTAMPTZ)`
- Single new env var: `ENCRYPTION_KEY` (required in production)
- AES-256-GCM via Node `crypto.createCipheriv` — zero new dependencies
- Config loads env vars first, then merges DB values on startup
- In-memory cache, invalidated when admin updates via UI

### v1.0 Gate — Operational Readiness

> Should-have items for a reliable production deployment.

| # | Item | Priority | Effort | Description |
|---|------|----------|--------|-------------|
| 1 | Improved healthcheck | Should | S | `/health` verifies DB connection and reports app version |
| 2 | Version endpoint | Should | S | `GET /api/version` → `{ version, commit, deployedAt }` for admin panel and debugging |
| 3 | DB backup cron | Should | S | Automated `pg_dump` to volume or S3 on schedule |
| 4 | Smoke test full user flow | Should | S | Register → create diagram → collaborate → share → export |
| 5 | Fix remaining rough edges | Should | M | Broken states, mobile issues |

### Admin Polish

> Not required for v1.0, but nice improvements for the admin experience.

| # | Feature | Type | Description |
|---|---------|------|-------------|
| 5 | Admin analytics | Full | Charts (recharts) for user growth, diagram creation, active sessions |
| 6 | Admin backup & logs | Full | Manual backup trigger, DB dump download, log viewer |
| 7 | Export CSV from admin | Frontend | Client-side CSV generation from user table |

### Nice to Have — Backlog

> Low priority. Pick these up when there are no active features in progress.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 13 | AI assist | Generate diagrams from text prompts (Claude API) | L |
| 14 | MCP server | Expose Drawhaus to AI agents for automated diagram creation | M |
| 15 | Public API | REST API for external integrations and automation | M |
| 17 | @mention in comments | User search + notification system | M |

### Not Planned

| Feature | Reason |
|---------|--------|
| E2EE | Breaks collab merge logic; self-hosted = you control the data |
| Voice / screenshare | Use Meet/Discord instead |
| Offline mode | Requires service worker + CRDT rewrite |
| SSO / SAML | Enterprise feature, overkill for personal/small team |
| Library marketplace | No community to serve |

### Archived / Discarded

> Evaluated but not worth the effort for current scope.

| # | Feature | Reason discarded |
|---|---------|-----------------|
| 8 | Versioning (snapshot history, timeline UI) | Complex for low usage; snapshots in DB are enough |
| 9 | PDF/PPTX export | PNG/SVG export covers the need; use external tools for slides |
| 10 | Presentations (slideshow mode) | Niche feature; use actual presentation tools instead |
| 11 | Libraries (reusable components) | Over-engineering for personal/small team use |
| 12 | Archive / soft delete | Simple delete is fine; DB backups cover recovery |
| 16 | Social OAuth (Apple) | Google OAuth shipped; Apple sign-in not worth the effort |

---

## Changelog & Release Process

### Versioning

Drawhaus uses **semantic versioning** (major.minor.patch):

- **Major** (1.0, 2.0): Breaking changes or major milestones
- **Minor** (0.7, 0.8): New features or significant enhancements
- **Patch** (0.6.1): Bug fixes and small improvements

### Release Process

1. **Develop** on feature branches, merge to `master` via PR
2. **Tag** the release: `git tag v0.x.0 && git push --tags`
3. **Bump** `version` in root `package.json`
4. **Update** `CHANGELOG.md` with a summary of changes
5. **Deploy** by pushing to the `production` branch — GitHub Actions builds, pushes to GHCR, and deploys via Kamal

### Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## Decision Log

| Decision | Chosen | Why |
|----------|--------|-----|
| Personal tool, not a product | Build for own needs | Replace $6/mo subscription, not compete |
| Skip E2EE | Self-hosted = you own the data | Breaks collab merge logic; redundant on own server |
| Vite SPA over Next.js | No feature requires SSR | Simpler deployment, static hosting |
| Cloudflare Pages | Same parent domain for cookies | Avoids third-party cookie restrictions |
| Axios over fetch | Interceptors, base URL, `withCredentials` | Cleaner error handling across the app |
| Snapshot versioning | Full JSONB snapshots | Simpler than event-sourced diffs; storage is cheap |
| No global state library | AuthContext + local state | App has no complex global state needs |
| MCP as differentiator | AI agents on own server | Unique angle no other self-hosted whiteboard has |
| Resend for email | Simple API, good DX | Transactional email for invites + password reset |
| API keys: hybrid env + DB | Infra secrets in env, feature secrets encrypted in DB | Allows admin UI config without server access; keeps boot deps in env |
| Setup wizard over manual .env | Wizard for feature config, env for infra | Reduces deploy friction; validates credentials before saving |
| No CSRF tokens | SameSite=Lax + CORS origin lock + httpOnly cookies | SPA architecture already mitigates CSRF; tokens add complexity without value |
| No migration system (v1.0) | Inline `initSchema()` with idempotent DDL | Single operator; `CREATE IF NOT EXISTS` is sufficient; revisit if team grows |
| Workspaces over per-diagram collaborators | Workspace-level access | Contractor use case: separate clients cleanly, share all diagrams in a workspace at once instead of one by one |
| Tags per-user, not per-workspace | Personal organization | Industry standard; tags are a personal view, not shared state |
| Lazy personal workspace | Created on first `/api/workspaces` list call | No migration code in app; existing users get personal workspace on next login |

---

## Sizing Key

| Size | Meaning |
|------|---------|
| S | Single PR, single layer |
| M | May touch multiple layers |
| L | New subsystem |

---

*Last updated: 2026-03-11*
