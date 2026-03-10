# Drawhaus Roadmap

> Self-hosted Excalidraw alternative — your whiteboard, on your server.

---

## What's Been Built (v0.1–v0.6)

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

---

## What's Next

### Phase 4 — Remaining Stitch Items

Small items from the design mockups that still need implementation.

| # | Feature | Type | Description |
|---|---------|------|-------------|
| ~~1~~ | ~~Category tags~~ | ~~Done~~ | ~~Full CRUD API + UI wired~~ |
| ~~2~~ | ~~Account deletion~~ | ~~Done~~ | ~~`DELETE /api/auth/account` with password confirmation, cascade~~ |
| ~~3~~ | ~~Comment reactions~~ | ~~Done~~ | ~~`comment_reactions` table + toggle like endpoint~~ |
| 4 | Board collapsible sidebar | Frontend | Slim icon bar (w-14) expanding to full sidebar (w-64) on hover |
| 5 | Admin analytics | Full | Charts (recharts) for user growth, diagram creation, active sessions |
| 6 | Admin backup & logs | Full | Manual backup trigger, DB dump download, log viewer |
| 7 | Export CSV from admin | Frontend | Client-side CSV generation from user table |

### Phase 5 — Power Features

> Goal: Things that genuinely improve daily use.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 8 | Versioning | Snapshot-based diagram history, timeline UI, restore | M |
| 9 | PDF/PPTX export | Export scenes as presentation-ready files | M |
| 10 | Presentations | Scene-based slideshow mode | M |
| 11 | Libraries | Personal reusable component library, synced across diagrams | M |
| 12 | Archive / soft delete | `deleted_at` column + filter toggle | S |

### Phase 6 — Stretch / Explore

> Goal: High-value features once the core is solid.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 13 | AI assist | Generate diagrams from text prompts (Claude API) | L |
| 14 | MCP server | Expose Drawhaus to AI agents for automated diagram creation | M |
| 15 | Public API | REST API for external integrations and automation | M |
| 16 | Social OAuth | Google/Apple login (passport.js). Markup exists. | M |
| 17 | @mention in comments | User search + notification system | M |

### Not Planned

| Feature | Reason |
|---------|--------|
| E2EE | Breaks collab merge logic; self-hosted = you control the data |
| Voice / screenshare | Use Meet/Discord instead |
| Offline mode | Requires service worker + CRDT rewrite |
| SSO / SAML | Enterprise feature, overkill for personal/small team |
| Library marketplace | No community to serve |

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

---

## Sizing Key

| Size | Meaning |
|------|---------|
| S | Single PR, single layer |
| M | May touch multiple layers |
| L | New subsystem |

---

*Last updated: 2026-03-10*
