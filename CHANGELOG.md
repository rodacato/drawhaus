# Changelog

All notable changes to Drawhaus are documented here.

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
