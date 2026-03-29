# Drawhaus Roadmap

> The living map of this project: where it came from, where it is, and where it's going.
> Ask: "What are we working on?", "What's left?", "Did we ship X?", "What's next after this?"

---

**Intent**: Drawhaus exists to replace paid whiteboard subscriptions for individuals and small teams who want full control over their data. The focus is on a polished single-user and small-team experience with collaborative diagramming, not on competing with enterprise tools. Every feature should earn its place by solving a real problem for this audience.

**Currently working on**: Backup All to Google Drive

**Current phase**: Phase 2 — Programmatic Access (see [Execution Strategy](VISION.md#execution-strategy) for the full arc)

---

## Prioritization Principles

When two features compete, these are the tiebreaker:

1. **Use it before building around it.** No new phase starts until the previous one is in daily use. Features that aren't used don't get expanded.
2. **Core loop first.** Create → edit → save → share is the heartbeat. Anything that strengthens this loop wins over anything that extends the platform.
3. **Self-hosted simplicity wins.** If a feature makes `docker compose up` harder or requires a new external service, it needs a very strong case.
4. **Dogfood over speculation.** Build what I actually need in my workflow. If I wouldn't use it this week, it goes to the backlog.
5. **One new thing at a time.** Don't adopt a new library, a new pattern, and a new integration in the same feature. Isolate risk.

---

## What's Been Built

Shipped and working in production. See [CHANGELOG.md](../CHANGELOG.md) for full version history.

| Area | Capabilities | Since |
|------|-------------|-------|
| **Editor** | Excalidraw engine, auto-save, thumbnails, object snapping, canvas settings (grid, background) | v0.1 |
| **Collaboration** | Concurrent multi-user editing (element-level merge, [ADR-022](adr/022-concurrent-editing-over-lock.md)), delta updates, real-time cursors + presence, viewport follow, raise hand signaling, threaded comments with resolve workflow, comment reactions, server-side merge with PostgreSQL transactions | v0.1 |
| **Templates** | 7 built-in templates, custom templates with workspace sharing, template picker, My Templates view, category filtering, usage tracking | v0.9 |
| **Diagram as Code** | Mermaid + PlantUML live import → editable Excalidraw elements, live SVG preview, replace/append toggle, custom converters for 14+ diagram types | v0.9 |
| **Snapshots** | Persistent snapshot system with auto-triggers, snapshot panel UI, preview modal, restore/rename, offline recovery, real-time sync, dashboard badges | v0.10 |
| **Workspaces** | Multi-tenant spaces (admin/editor/viewer roles), member invites, workspace-scoped folders + diagrams, ownership transfer with bulk resource transfer | v0.7 |
| **Dashboard** | Recent/Starred cross-workspace views, folders as content sections, grid/list toggle, starred diagrams, duplicate, inline rename, workspace switcher | v0.4 |
| **Sharing** | Share links with roles + expiration, guest access via tokens, read-only embeds (`/embed/:token`) | v0.1 |
| **Export & Import** | PNG/SVG export, `.excalidraw` file import, Google Drive import | v0.3 |
| **Google Drive** | OAuth login + linking, Drive export, Drive import, auto-backup on save, scope upgrade flow | v0.7 |
| **Auth** | Register/login/logout, sessions, forgot password with email reset, Google OAuth, GitHub OAuth, identity linking by email, connected accounts management (link/unlink), account deletion with cascade, delete guard for workspace owners | v0.1 |
| **Admin** | User management, metrics, registration toggle, invite via email (Resend), setup wizard (3-step), integration secrets (AES-256-GCM), maintenance mode | v0.3 |
| **Security** | Helmet headers, rate limiting (Redis-backed when available), audit logger, RBAC, cookie hardening, encrypted secrets in DB | v0.8 |
| **UI & Branding** | Dark/light theme, Bauhaus-inspired branding, toast notifications, confirm dialogs, style guide, board sidebar with semantic groups | v0.6 |
| **Landing Page** | Hero with real screenshots, "Why Drawhaus?" value props, "How it works" deploy steps, 12-feature grid, comparison badges, tech stack logos, automated Playwright screenshots | v0.9 |
| **Public API** | API key management (create/revoke), `/v1/` REST endpoints for diagrams (CRUD), workspace-scoped auth, rate limiting, request logging, OpenAPI 3.1 spec + Redocly docs | v0.11 |
| **MCP Server** | `@drawhaus/mcp` npm package — 5 tools (CRUD) + validate_elements, 2 resources, 4 prompts with curated spec, stdio transport, health check on startup | v0.11 |
| **Helpers** | `@drawhaus/helpers` — shared element builders, dagre layout engine, arrow routing, element validator, merge utilities (mergeElements, mergeDelta, diffElements), curated Excalidraw spec for LLMs | v0.11 |
| **DevOps** | Docker + Kamal deploy (backend + frontend), Docker Hub auth in CI, automated DB backups (7-day retention), health endpoint, `/api/version`, Redis adapter for horizontal scaling, shared Redis client for rate limiting + snapshot dedup, nginx frontend with immutable asset caching, node-pg-migrate versioned migrations | v0.1 |
| **Testing** | 5-phase Playwright E2E suite (permissions, CRUD, sharing, auth, visual regression), 139 backend unit tests, 91 helpers tests, marketing screenshot automation | v0.8 |
| **Architecture** | Clean Architecture (application/domain/infrastructure), Vite + React Router + Axios, composition root, `validate()` middleware, `withTransaction`, response interceptor | v0.5 |

---

## What's Next

Features prioritized and ready to build. Specs live in [`docs/specs/`](specs/).

| # | Feature | Summary | Priority | Effort | Status | Spec |
|---|---------|---------|----------|--------|--------|------|
| 1 | Backup All to Drive | One-click workspace backup to Google Drive with progress bar | High | M | in-progress | [spec](specs/backup-all-to-drive.md) |
| 2 | Webhooks | Notify external systems (Slack, CI) on diagram events. HMAC-SHA256 signed, retry queue | High | S | backlog | [spec](specs/webhooks.md) |
| 3 | Presenter Mode | Owner can lock editing during presentations; viewers can pan/zoom but not edit | Medium | S | backlog | — |
| 4 | Link previews (OpenGraph) | HTML endpoint serving OG meta tags + 302 redirect to SPA. Uses existing thumbnails as `og:image` | Medium | S | backlog | — |
| 5 | GitHub Gist export | Export `.excalidraw` to Gist (public/secret). Per-user PAT, encrypted storage | Medium | S | backlog | [spec](specs/github-gist-export.md) |

---

## Backlog

Ideas evaluated but not yet prioritized. When ready to build, write a spec in `specs/` and move to "What's Next".

| # | Feature | Summary | Intent | Effort |
|---|---------|---------|--------|--------|
| 1 | AI assist | Text → Excalidraw elements via Claude API with preview/accept flow | Let users describe a diagram in words and get a starting point they can refine visually | L |
| 2 | @mention in comments | User search + notification system in threaded comments | Make comment threads actionable — tag someone to get their attention without switching to Slack | M |
| 3 | Embed SDK | JS SDK (`@drawhaus/embed`) — iframe + postMessage for theme, zoom, events | Allow embedding Drawhaus diagrams in docs, wikis, and internal tools with interactivity | M |
| 4 | CLI tool | `drawhaus create/export/import` from terminal. Requires Public API | Enable automation and scripting — generate diagrams from CI, import from other tools in batch | M |
| 5 | Admin analytics | Charts (recharts) for user growth, diagram creation, active sessions | Give admins visibility into adoption and usage patterns on their instance | M |
| 6 | Admin backup & logs | DB dump download, log viewer | Self-service ops for admins without SSH access to the server | S |
| 7 | Admin CSV export | Client-side CSV generation from user table | Let admins pull user data for reporting or migration without direct DB access | S |
| 8 | DX polish | Makefile wrapper, husky + lint-staged | Reduce friction for contributors; catch lint/format issues before they reach CI | S |
| 9 | CRDT collaboration (Yjs) | Adopt Yjs for mathematical convergence guarantees at scale | For when 10+ simultaneous editors need true conflict-free editing. Current merge-by-version is sufficient for small teams ([ADR-022](adr/022-concurrent-editing-over-lock.md)) | L |

---

## Not Doing

Evaluated and decided against. Reasoning preserved for future reference. Never delete from this table — if revisited, update the reasoning.

| Feature | Why not | Revisit if |
|---------|---------|------------|
| **E2EE** | Server needs element state for merge. Redundant when you own the server ([ADR-018](adr/018-skip-e2e-encryption.md)) | Multi-tenant hosting with untrusted tenants, or regulatory mandate |
| **Voice / Screenshare** | WebRTC infra is complex to self-host. Users already have Meet/Discord/Slack | Never — out of scope |
| **Offline Mode** | Requires CRDT rewrite for offline conflict resolution. Server is always on your network | Mobile PWA priority, or CRDT adoption makes it trivial |
| **SSO / SAML** | Enterprise complexity. Google + GitHub OAuth covers the need | Enterprise customers with budget |
| **Library Marketplace** | No community to serve. Discovery + moderation overhead for personal/small-team tool | 100+ active users |
| **PDF / PPTX Export** | PNG/SVG covers the need. Users paste SVG into presentation tools | Multiple user requests, or a lightweight library appears |
| **Presentations (Slideshow)** | Niche feature competing with actual presentation tools | Never — use Keynote/Slides |
| **Reusable Component Libraries** | Excalidraw's built-in library covers basics. Custom libraries need management UI, versioning, sharing | Template system proves insufficient |
| **Apple Sign-In** | Painful implementation (key rotation, email relay, $99/yr). Google + GitHub + email sufficient | Never |

---

## Specs

Technical specs created for features. Full specs in [`docs/specs/`](specs/).

| Spec | Feature | Status |
|------|---------|--------|
| [backup-all-to-drive](specs/backup-all-to-drive.md) | Backup All to Drive | in-progress |
| [webhooks](specs/webhooks.md) | Webhooks | backlog |
| [github-gist-export](specs/github-gist-export.md) | GitHub Gist Export | backlog |

---

## Decision Log

Architectural decisions that shaped Drawhaus. Full ADRs in [`docs/adr/`](adr/).

| Decision | Chosen | Why | ADR |
|----------|--------|-----|-----|
| Personal tool, not a product | Build for own needs | Replace $6/mo subscription, not compete | [001](adr/001-personal-tool-scope.md) |
| Clean Architecture | application/domain/infrastructure layers | Enforce boundaries, testable use cases | [002](adr/002-clean-architecture.md) |
| Vite SPA over Next.js | No feature requires SSR | Simpler deployment, static hosting | [003](adr/003-vite-spa-over-nextjs.md) |
| Kamal deployment | Docker + Kamal | Zero-downtime deploys on single VPS | [004](adr/004-kamal-deployment.md) |
| Self-hosted frontend | nginx serving Vite build | Same parent domain for cookies | [005](adr/005-self-hosted-frontend.md) |
| Concurrent editing over lock | Element-level merge + `SELECT ... FOR UPDATE` | Elements have `id` + `version`; merge is deterministic; CRDTs deferred | [022](adr/022-concurrent-editing-over-lock.md) |
| Socket protocol design | Socket.IO + msgpack + Redis adapter | Room model, rate limits, volatile cursors | [007](adr/007-socket-protocol-design.md) |
| Full JSONB snapshots | Store complete element array per snapshot | Simpler than event-sourced diffs; storage is cheap | [009](adr/009-full-jsonb-snapshots.md) |
| Workspaces over per-diagram collab | Workspace-level access | Separate clients cleanly, share all diagrams at once | [010](adr/010-workspaces-over-per-diagram-collab.md) |
| API namespace separation | `/api/` internal, `/v1/` public | Different auth, rate limits, and versioning guarantees | [011](adr/011-api-namespace-separation.md) |
| API keys: hybrid env + DB | Infra secrets in env, feature secrets encrypted in DB | Admin UI config without server access | [012](adr/012-api-key-hybrid-storage.md) |
| MCP as differentiator | AI agents on own server | Unique angle no other self-hosted whiteboard has | [013](adr/013-mcp-as-differentiator.md) |
| Diagram as Code: import only | Live Import panel, no bidirectional export | Canvas → text is lossy; keeps scope manageable | [014](adr/014-diagram-as-code-import-only.md) |
| PlantUML: custom converter | Editable elements, not static SVG | Users can move/style/edit imported elements | [015](adr/015-custom-plantuml-converter.md) |
| Monorepo structure | npm workspaces (frontend, backend, helpers, mcp, e2e) | Shared types, single CI, atomic changes | [016](adr/016-monorepo-structure.md) |
| No CSRF tokens | SameSite=Lax + CORS origin lock + httpOnly cookies | SPA architecture already mitigates CSRF | [017](adr/017-no-csrf-tokens.md) |
| Skip E2EE | Self-hosted = you own the data | Breaks collab merge logic; redundant | [018](adr/018-skip-e2e-encryption.md) |
| Versioned migrations | `node-pg-migrate` over inline DDL | Schema changes tracked as versioned files | [019](adr/019-versioned-migrations.md) |
| Redis as shared state | Rate-limit + snapshot dedup via Redis | In-memory fallback preserves single-instance simplicity | [021](adr/021-redis-shared-state.md) |

Other decisions not warranting a full ADR:

| Decision | Chosen | Why |
|----------|--------|-----|
| Axios over fetch | Interceptors, base URL, `withCredentials` | Cleaner error handling across the app |
| No global state library | AuthContext + local state | App has no complex global state needs |
| Resend for email | Simple API, good DX | Transactional email for invites + password reset |
| Setup wizard over manual .env | Wizard for feature config, env for infra | Reduces deploy friction; validates credentials before saving |
| Tags per-user, not per-workspace | Personal organization | Industry standard; tags are a personal view, not shared state |
| Lazy personal workspace | Created on first `/api/workspaces` list call | No migration code; existing users get personal workspace on next login |
| Landing page: badges over comparison table | Friendly "plus" framing | Avoid adversarial positioning against Excalidraw (same engine) |
| Screenshots: automated Playwright | Regenerable on UI changes | Prevents stale marketing assets |
| Gist auth: per-user PAT, not OAuth | Simpler, no GitHub OAuth app needed | User manages their own token; encrypted with existing ENCRYPTION_KEY |

---

## Sizing Key

| Size | Meaning |
|------|---------|
| S | Single PR, single layer |
| M | May touch multiple layers |
| L | New subsystem |

---

*Last updated: 2026-03-29*
