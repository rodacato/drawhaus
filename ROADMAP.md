# Drawhaus Roadmap

> Self-hosted Excalidraw alternative — your whiteboard, on your server.

**Currently working on**: Backup All to Google Drive

---

## What's Been Built

Shipped and working in production. See [CHANGELOG.md](CHANGELOG.md) for full version history.

| Area | Capabilities | Since |
|------|-------------|-------|
| **Editor** | Excalidraw engine, auto-save, thumbnails, object snapping, canvas settings (grid, background) | v0.1 |
| **Templates** | 7 built-in templates, custom templates with workspace sharing, template picker, My Templates view, category filtering, usage tracking | v0.9 |
| **Diagram as Code** | Mermaid live import → editable Excalidraw elements, live SVG preview, replace/append toggle | v0.9 |
| **Collaboration** | Real-time cursors + presence, viewport follow, editor lock (single-writer), threaded comments with resolve workflow, comment reactions | v0.1 |
| **Snapshots** | Persistent snapshot system with auto-triggers, snapshot panel UI, preview modal, restore/rename, offline recovery, real-time sync, dashboard badges | v0.10 |
| **Workspaces** | Multi-tenant spaces (admin/editor/viewer roles), member invites, workspace-scoped folders + diagrams, ownership transfer with bulk resource transfer | v0.7 |
| **Dashboard** | Recent/Starred cross-workspace views, folders as content sections, grid/list toggle, starred diagrams, duplicate, inline rename, workspace switcher | v0.4 |
| **Sharing** | Share links with roles + expiration, guest access via tokens, read-only embeds (`/embed/:token`) | v0.1 |
| **Export & Import** | PNG/SVG export, `.excalidraw` file import, Google Drive import | v0.3 |
| **Google Drive** | OAuth login + linking, Drive export, Drive import, auto-backup on save, scope upgrade flow | v0.7 |
| **Auth** | Register/login/logout, sessions, forgot password with email reset, Google OAuth, account deletion with cascade, delete guard for workspace owners | v0.1 |
| **Admin** | User management, metrics, registration toggle, invite via email (Resend), setup wizard (3-step), integration secrets (AES-256-GCM), maintenance mode | v0.3 |
| **Security** | Helmet headers, rate limiting, audit logger, RBAC, cookie hardening, encrypted secrets in DB | v0.8 |
| **UI & Branding** | Dark/light theme, Bauhaus-inspired branding, toast notifications, confirm dialogs, style guide, board sidebar with semantic groups | v0.6 |
| **Landing Page** | Hero with real screenshots, "Why Drawhaus?" value props, "How it works" deploy steps, 12-feature grid, comparison badges, tech stack logos, automated Playwright screenshots | v0.9 |
| **DevOps** | Docker + Kamal deploy (backend + frontend), automated DB backups (7-day retention), health endpoint, `/api/version`, Redis adapter for horizontal scaling, nginx frontend with immutable asset caching, node-pg-migrate versioned migrations | v0.1 |
| **Testing** | 5-phase Playwright E2E suite (permissions, CRUD, sharing, auth, visual regression), backend unit tests, marketing screenshot automation | v0.8 |
| **Public API** | API key management (create/revoke), `/v1/` REST endpoints for diagrams (CRUD), workspace-scoped auth, rate limiting, request logging, OpenAPI 3.1 spec + Redocly docs | v0.11 |
| **MCP Server** | `@drawhaus/mcp` npm package — 5 tools (CRUD) + validate_elements, 2 resources, 4 prompts with curated spec, stdio transport, health check on startup | v0.12 |
| **Helpers** | `@drawhaus/helpers` — shared element builders, dagre layout engine, arrow routing, element validator, curated Excalidraw spec for LLMs | v0.13 |
| **Architecture** | Clean Architecture (application/domain/infrastructure), Vite + React Router + Axios, composition root, `validate()` middleware, `withTransaction`, response interceptor | v0.5 |

---

## What's Next

Features prioritized and ready to build. Full implementation specs live in [`docs/specs/`](docs/specs/).

### How to use this section

Move items through these statuses:

| Status | Meaning |
|--------|---------|
| `backlog` | Spec written, ready to start |
| `in-progress` | Actively being built |
| `done` | Shipped — move row to "What's Been Built" and update CHANGELOG |

| # | Feature | Summary | Priority | Effort | Status | Spec |
|---|---------|---------|----------|--------|--------|------|
| 1 | Backup All to Drive | One-click workspace backup to Google Drive with progress bar | High | M | in-progress | [spec](docs/specs/backup-all-to-drive.md) |
| 2 | API Keys | API key infrastructure for `/v1/` public API auth, management UI | High | M | done | [spec](docs/specs/api-keys.md) |
| 3 | Public API /v1/ | RESTful CRUD endpoints for diagrams at `/v1/`, authenticated with API keys | High | M | done | [spec](docs/specs/public-api-v1.md) |
| 4 | OpenAPI + Redocly | Machine-readable spec and interactive docs for `/v1/` | High | S | done | [spec](docs/specs/openapi-redocly.md) |
| 5 | MCP Server | AI agents create/read/update diagrams via MCP protocol | High | M | done | [spec](docs/specs/mcp-server.md) |
| 6 | Drawhaus Helpers | Shared element builders, layout engine, validator, curated spec | High | M | done | [spec](docs/specs/excalidraw-helpers-and-layout.md) |
| 7 | PlantUML Import | Custom PlantUML → editable Excalidraw elements (class, sequence, activity) | Medium | M | backlog | [spec](docs/specs/plantuml-import.md) |

---

## Backlog

Ideas evaluated but not yet prioritized. When ready to build, write a spec in `docs/specs/` and move to "What's Next".

| # | Feature | Summary | Effort | Spec |
|---|---------|---------|--------|------|
| 1 | AI assist | Text → Excalidraw elements via Claude API with preview/accept flow | L | — |
| 2 | Webhooks | Notify external systems on diagram events. HMAC-SHA256 signed, retry queue, failure log | S | [spec](docs/specs/webhooks.md) |
| 3 | Link previews (OpenGraph) | Lightweight HTML endpoint serving OG meta tags + 302 redirect to SPA. Uses existing thumbnails as `og:image` | S | — |
| 4 | GitHub Gist export | Export `.excalidraw` to Gist (public/secret). Per-user PAT, encrypted storage | S | [spec](docs/specs/github-gist-export.md) |
| 5 | ~~Public API~~ | ~~REST API with API key authentication~~ — shipped in v0.11 | — | — |
| 6 | @mention in comments | User search + notification system in threaded comments | M | — |
| 7 | Embed SDK | JS SDK (`@drawhaus/embed`) — iframe + postMessage for theme, zoom, events | M | — |
| 8 | CLI tool | `drawhaus create/export/import` from terminal. Requires Public API first | M | — |
| 9 | DX polish | ADRs in `docs/adr/`, OpenAPI spec, Makefile wrapper, husky + lint-staged | S–M | — |
| 10 | Admin analytics | Charts (recharts) for user growth, diagram creation, active sessions | M | — |
| 11 | Admin backup & logs | DB dump download, log viewer | S | — |
| 12 | Admin CSV export | Client-side CSV generation from user table | S | — |

---

## Not Doing

Evaluated and decided against. Includes full context so the reasoning is preserved.

### E2EE (End-to-End Encryption)

**The idea**: Encrypt diagram content client-side so the server never sees plaintext data. Only users with the key can decrypt.

**Why not**: Breaks the real-time collaboration merge logic — the server needs to see element state to resolve conflicts. Also redundant for a self-hosted tool where you own the server and the database. The threat model doesn't justify the complexity.

**How it could be done**: Web Crypto API for client-side encryption, per-diagram key wrapped with user's master key, key exchange protocol for shared diagrams. Would require rewriting the collab layer to merge encrypted payloads blindly or decrypt server-side (defeating the purpose).

**Revisit if**: Multi-tenant hosting with untrusted tenants sharing the same instance, or regulatory requirements mandate it.

### Voice / Screenshare

**The idea**: Built-in voice chat and screen sharing during collaboration sessions.

**Why not**: WebRTC infrastructure is complex to self-host reliably (TURN servers, NAT traversal). Users already have Meet, Discord, Slack huddles. Building a worse version of existing tools adds maintenance burden with no unique value.

**How it could be done**: WebRTC with a TURN server (coturn), signaling via existing Socket.IO channel, `<video>` overlay on canvas. Would need STUN/TURN config in setup wizard, bandwidth management, and fallback for restricted networks.

**Revisit if**: Never — this is firmly out of scope.

### Offline Mode

**The idea**: Service worker + local storage so the editor works without a server connection. Sync changes when reconnecting.

**Why not**: Requires a CRDT rewrite of the collaboration layer to handle offline conflict resolution. The current architecture assumes a connected server for state merging. Massive effort for a self-hosted tool where the server is always on your network.

**How it could be done**: Service worker for asset caching, IndexedDB for diagram storage, Yjs or Automerge CRDT for conflict-free merging, sync queue that replays operations on reconnect. The Excalidraw collab protocol would need to be replaced entirely.

**Revisit if**: Mobile PWA becomes a priority, or CRDT libraries mature enough to drop in without rewriting collab.

### SSO / SAML

**The idea**: Enterprise single sign-on with SAML 2.0 or OpenID Connect for corporate identity providers.

**Why not**: Enterprise feature that adds significant complexity. Drawhaus is built for personal and small team use. Google OAuth covers the "social login" need. SAML libraries are notoriously painful.

**How it could be done**: `passport-saml` or `openid-client` strategy, IdP metadata endpoint, attribute mapping config in setup wizard, JIT user provisioning on first login.

**Revisit if**: Enterprise customers appear with budget, or a clean SAML library makes it trivial.

### Library Marketplace

**The idea**: Shared component library where users upload and browse reusable shapes, icons, and diagram fragments.

**Why not**: No community to serve. Drawhaus is a personal/small-team tool. Building discovery, moderation, and distribution for a marketplace of one user is pure overhead.

**How it could be done**: Library items as JSON blobs in DB, tags + search, thumbnail generation, import/export, optional public gallery with moderation queue.

**Revisit if**: Drawhaus grows a community of 100+ active users.

### ~~Versioning (Snapshot History)~~ → Shipped in v0.10.0

Shipped as the **Snapshot System** — persistent snapshots with auto-triggers, sidebar panel UI, preview modal, restore/rename actions, offline recovery, and real-time sync across users. See CHANGELOG v0.10.0.

### PDF / PPTX Export

**The idea**: Export diagrams as PDF documents or PowerPoint slides directly from the app.

**Why not**: PNG/SVG export covers the need. Users who need slides can paste SVG into their presentation tool. Building PDF/PPTX generation adds dependencies (puppeteer or pptxgenjs) for a niche use case.

**How it could be done**: `pptxgenjs` for PPTX (SVG → slide), `jspdf` or Puppeteer for PDF (render SVG to canvas → PDF page). Multi-scene → multi-page/slide.

**Revisit if**: Multiple users request it, or a lightweight library makes it trivial.

### Presentations (Slideshow Mode)

**The idea**: Turn multi-scene diagrams into a fullscreen slideshow with transitions.

**Why not**: Niche feature that competes with actual presentation tools. Better to focus on what Drawhaus does uniquely (collaborative diagramming) than build a worse Keynote.

**How it could be done**: Fullscreen API, scene array as slides, keyboard/swipe navigation, CSS transitions between scenes, presenter notes in a secondary panel.

**Revisit if**: Never — use presentation tools for presentations.

### Reusable Component Libraries

**The idea**: Save and organize reusable shapes/groups that can be dragged onto any diagram.

**Why not**: Over-engineering for personal/small team use. Excalidraw's built-in library feature covers basic needs. Custom libraries need management UI, versioning, and sharing — too much complexity.

**How it could be done**: `library_items` table, drag-and-drop panel, group selection → "Save to Library", workspace-level sharing, optional export as `.excalidrawlib` file.

**Revisit if**: Template system proves insufficient for reuse patterns.

### Social OAuth (Apple Sign-In)

**The idea**: Sign in with Apple ID alongside existing Google OAuth.

**Why not**: Apple's sign-in implementation is notoriously painful (key rotation, email relay, App Store requirements). Google OAuth is shipped and covers the need. Diminishing returns.

**How it could be done**: `passport-apple` strategy, Apple Developer Program membership ($99/yr), private key + key ID config, email relay domain verification.

**Revisit if**: Never — Google OAuth + email/password is sufficient.

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
| Versioned migrations | `node-pg-migrate` over inline DDL | Adopted in v0.10.0; schema changes now tracked as versioned migration files |
| Workspaces over per-diagram collaborators | Workspace-level access | Contractor use case: separate clients cleanly, share all diagrams in a workspace at once instead of one by one |
| Tags per-user, not per-workspace | Personal organization | Industry standard; tags are a personal view, not shared state |
| Lazy personal workspace | Created on first `/api/workspaces` list call | No migration code in app; existing users get personal workspace on next login |
| Diagram as Code: import only | Live Import panel, not native code editor | No bidirectional export (canvas → text); keeps scope manageable |
| PlantUML: custom converter over Kroki embed | Editable elements, not static SVG | Users can move/style/edit imported elements; Kroki fallback for unsupported types |
| Landing page: badges over comparison table | Friendly "plus" framing | Avoid adversarial positioning against Excalidraw (same engine) |
| Screenshots: automated Playwright | Regenerable on UI changes | Prevents stale marketing assets; seeded with attractive demo data |
| Gist auth: per-user PAT, not OAuth | Simpler, no GitHub OAuth app needed | User manages their own token; encrypted with existing ENCRYPTION_KEY infra |

---

## Sizing Key

| Size | Meaning |
|------|---------|
| S | Single PR, single layer |
| M | May touch multiple layers |
| L | New subsystem |

---

*Last updated: 2026-03-19*
