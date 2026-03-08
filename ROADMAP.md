# Drawhaus Roadmap

> Personal self-hosted Excalidraw alternative — feature planning based on own needs
>
> Not competing with Excalidraw. This project exists to replace a $6/mo Plus subscription
> with a self-hosted instance that does exactly what I need.

---

## Current State (v0.1 — MVP)

What Drawhaus already ships:

| Feature | Status |
|---------|--------|
| Full Excalidraw editor | Done |
| Auth (register/login/logout) | Done |
| Diagram CRUD + auto-save | Done |
| Real-time collaboration (Socket.IO) | Done |
| Presence (cursors, user list, viewport follow) | Done |
| Share links with roles (editor/viewer) + expiration | Done |
| Guest access via share token | Done |
| Permission enforcement (socket + API) | Done |
| Production deployment (Kamal + Cloudflare Tunnel) | Done |

---

## Feature Gap vs Excalidraw

### Free tier features we're missing

| Feature | Excalidraw Free | Drawhaus | Effort |
|---------|----------------|----------|--------|
| Export PNG/SVG/clipboard | Yes | No | S |
| Import .excalidraw files | Yes | No | S |
| Libraries (reusable components) | Yes | No | M |
| E2EE (client-side encryption) | Yes | No | L |

### Plus ($6/mo) features we're missing

| Feature | Excalidraw Plus | Drawhaus | Effort |
|---------|----------------|----------|--------|
| Multiple scenes per diagram | Yes | No (1 scene) | M |
| Folders / organization | Yes | No | M |
| Cloud persistence | Yes | Yes (Postgres) | Done |
| Access management | Yes | Partial (roles exist) | S |
| Read-only embed links | Yes | No | S |
| Presentations mode | Yes | No | M |
| Extended AI | Yes | No | L |
| Comments / annotations | Yes | No | M |
| Voice hangouts + screenshare | Yes | No | XL |
| Teams management | Yes | No | M |

---

## Expert Panel Discussion

> Context: personal project to replace Excalidraw Plus subscription ($6/mo).
> Not a startup, not competing. Build what's useful, skip what isn't.

### Maya Chen (Product Strategy)

> "What do you actually use daily?" — that's the filter.

Since this is for personal use, feature prioritization is simple: build what you'll use, skip what you won't. Export is table stakes (you'll need to paste diagrams into docs). Folders matter once you have 10+ diagrams. Multi-scene is useful for architecture docs with multiple views.

**Interesting from Excalidraw's roadmap:**
- **Versioning** — they're building it. High value for personal use: "what did this diagram look like last week?" Undo history doesn't survive page reloads.
- **MCP** — they're adding agent integration. If you're already using Claude, being able to say "draw me an architecture diagram" and have it appear in Drawhaus is compelling.
- **Fulltext search** — searching inside diagram content, not just titles. Valuable once you have many diagrams.

**Skip:** SSO, teams management, library marketplace — enterprise/community features irrelevant for personal use.

### Rafa Alvarez (Staff Architect)

> Export is almost free. Versioning is the most interesting architecture challenge.

Export: Excalidraw exposes `exportToBlob()`/`exportToSvg()`. Frontend-only, zero backend work, done in a day.

**Versioning** is worth designing well early. Two approaches:
1. **Snapshot-based:** Save full `elements` JSONB on each explicit save. Simple, but storage grows fast.
2. **Event-sourced:** Store diffs/patches. Compact, but complex to reconstruct.

Recommendation: snapshot-based. Disk is cheap, and for personal use the volume is tiny. Add a `diagram_versions` table with `(diagram_id, version, elements, created_at)`. Auto-snapshot every N minutes or on explicit save.

**MCP server** is architecturally clean if we already have a REST API. It's essentially a JSON-RPC wrapper over existing endpoints. Worth exploring in Phase 5.

**PDF/PPTX export:** Excalidraw just shipped this. If multi-scene is in place, exporting scenes as slides is natural. Depends on Phase 2 multi-scene.

### Nadia Romero (Security)

> Self-hosted means YOU control the data. E2EE is redundant here.

For personal self-hosted use, E2EE makes zero sense — you own the server. The threat model is different from a SaaS.

**Must:** Keep `.env.production` out of git, keep Postgres bound to localhost, keep share links time-limited. All already done.

**Should for versioning:** Make sure old versions can't be accessed by share link viewers unless explicitly granted. Default: only owner sees version history.

### Leo Vargas (UX/Collaboration)

> Versioning UI should be dead simple — a timeline slider, not a git log.

When versioning ships, show it as a visual timeline in a side panel. Click a point → see that version read-only. One button to restore. Don't over-engineer with diff views or merge tools.

**Archive** (from Excalidraw's roadmap) is worth stealing — it's just a `deleted_at` column and a filter toggle. Prevents accidental data loss for ~30 minutes of work.

### Iris Novak (DevOps)

> Versioning means more storage. Plan for it.

With snapshot versioning, each save stores the full elements JSON. For personal use this is fine (a complex diagram is ~100KB, 100 versions = 10MB). But add a retention policy: keep last 50 versions, or versions from last 30 days.

Structured logging is still the #1 ops gap.

### Ethan Brooks (Growth/GTM)

> The MCP angle is genuinely unique.

Excalidraw is building MCP for their Plus tier. If Drawhaus ships MCP support for a self-hosted instance, that's a real differentiator for developers: "I can have my AI agent create and update diagrams on my own server." No other self-hosted whiteboard does this.

**Positioning update:** "Self-hosted Excalidraw with AI agent support."

---

## Roadmap

### Phase 1 — Table Stakes (next)

> Goal: Remove adoption blockers. Usable as daily Excalidraw replacement.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 1 | Export PNG/SVG | Leverage Excalidraw's `exportToBlob`/`exportToSvg` APIs | S |
| 2 | Import .excalidraw | Load `.excalidraw` JSON files into a new diagram | S |
| 3 | Embed links | Read-only iframe mode via `/embed/[token]` | S |
| 4 | Structured logging | pino in backend, request ID propagation | S |
| 5 | User settings | Profile editing (name, email) + password change | S |
| 6 | Admin panel | Instance control: registration toggle, user management, metrics | M |

#### Admin Panel — Scope (expert panel consensus)

**User Settings** (`/settings`):
- Profile section: edit name, email
- Security section: change password (requires current password)

**Admin Panel** (`/admin`):
- Overview: metrics cards (users, diagrams, DB size, uptime, active sockets)
- Users: table with name/email/role/status/registered date + disable/enable toggle
- Settings: registration open/closed toggle, instance name

**Key decisions:**
- First registered user = admin automatically (no env var seed needed)
- Roles: `user` | `admin` only (no granular roles)
- `site_settings` table with explicit columns (type-safe, one row, DB-enforced defaults)
- Disabling a user invalidates all their sessions immediately
- No invite system — open registration temporarily instead

### Phase 2 — Team Experience

> Goal: Make Drawhaus useful for teams of 5-20.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 7 | Folders | Flat folder structure, sidebar navigation, drag-and-drop | M |
| 8 | Search | Full-text search on diagram titles and content | S |
| 9 | Multi-scene | Multiple pages per diagram, scene tabs, schema migration | M |
| 10 | Diagram thumbnails | Auto-generated preview on save (canvas snapshot) | M |

### Phase 3 — Collaboration Depth

> Goal: Async collaboration features.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 11 | Comments | Element-anchored threads, notifications | M |
| 12 | Teams / workspaces | Team entity, invite flow, shared folders | M |
| 13 | Activity feed | Recent changes per diagram, who edited what | M |
| 14 | Audit log | Share link access tracking, admin visibility | S |

### Phase 4 — Power Features

> Goal: Things that would genuinely improve daily use. Scope TBD.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 15 | Versioning | Track diagram history over time, revert to previous versions | M |
| 16 | PDF/PPTX export | Export scenes as presentation-ready files | M |
| 17 | Presentations | Scene-based slideshow mode | M |
| 18 | Libraries | Reusable component library (personal, synced across diagrams) | M |

### Phase 5 — Stretch / Explore

> Goal: High-value features worth exploring once the core is solid.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 19 | AI assist | Generate diagrams from text prompts (Claude API) | L |
| 20 | MCP server | Expose Drawhaus to AI agents for automated diagram creation | M |
| 21 | Public API | REST API for external integrations, automation | M |
| 22 | Archive / soft delete | Archive diagrams instead of permanent delete | S |

### Not Planned

| Feature | Reason |
|---------|--------|
| E2EE | Breaks server-side collaboration logic; self-hosted = you control the data anyway |
| Voice / screenshare | Enormous scope, use Meet/Huddle/Discord instead |
| Offline mode | Requires service worker + CRDT rewrite; always-connected is fine for personal use |
| SSO / SAML | Enterprise feature, overkill for personal/small team |
| Custom fonts | Nice-to-have but Excalidraw defaults are fine |
| Library marketplace | Community feature, no community to serve |

---

## Sizing Key

| Size | Meaning |
|------|---------|
| S | Single PR, single layer |
| M | May touch multiple layers |
| L | New subsystem |
| XL | Significant architecture change |

---

## Excalidraw+ Roadmap — What's Relevant to Us

> Source: https://plus.excalidraw.com/roadmap (checked 2026-03-08)

| Excalidraw Feature | Status | Relevant? | Our Plan |
|--------------------|--------|-----------|----------|
| Fulltext search | In progress | Yes | Phase 2 (#8) — search diagram content, not just titles |
| Versioning | In progress | Yes | Phase 4 (#15) — snapshot-based, timeline UI |
| PDF/PPTX export | Shipped | Yes | Phase 4 (#16) — after multi-scene |
| MCP (agent integration) | Backlog | Yes | Phase 5 (#20) — unique for self-hosted |
| Public API | In progress | Yes | Phase 5 (#21) — enables MCP and automation |
| Archive (soft delete) | In progress | Yes | Phase 5 (#22) — `deleted_at` column, simple |
| Generate anything (AI) | In progress | Maybe | Phase 5 (#19) — explore after core is solid |
| Nesting with folders | Backlog | Yes | Phase 2 (#7) — already planned |
| Shared library | Backlog | Low | Phase 4 (#18) — personal library only |
| Presenter notes | In progress | Low | Could add alongside presentations |
| Custom fonts | In progress | No | Default fonts are fine |
| SSO | Backlog | No | Personal use, not enterprise |
| Self-hosting | Backlog | Done | We're already self-hosted |
| Library marketplace | In progress | No | No community to serve |
| SOC 2 | Shipped | No | Compliance is irrelevant for personal use |
| Screensharing | Shipped | No | Use external tools |

---

## Decision Log

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Personal tool, not a product | Build for own needs | Feature parity with Excalidraw | Replace $6/mo subscription, not compete |
| Skip E2EE | Self-hosted = you own the data | Full client-side E2EE | Breaks collab merge logic; redundant on own server |
| Skip voice/screenshare | Use Meet/Discord | Build WebRTC | XL effort, orthogonal to diagramming |
| Export first, not AI first | Export in Phase 1 | AI as priority | Can't use a tool that traps your data |
| Versioning over comments | Versioning in Phase 4 | Comments first | Personal use: "what did this look like before?" > async discussion |
| Snapshot versioning | Full JSONB snapshots | Event-sourced diffs | Simpler, storage is cheap for personal volume |
| MCP as differentiator | Explore in Phase 5 | Skip AI integration | Unique angle: AI agents creating diagrams on own server |

---

*Last updated: 2026-03-08*
