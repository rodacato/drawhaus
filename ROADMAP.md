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

### Phase 3 — Static Frontend Migration

> Goal: Replace Next.js with Vite + React Router + Axios. No feature in the roadmap
> requires SSR — the app is a SPA behind auth. This simplifies deployment, removes a
> Node server, and enables static hosting via Cloudflare Pages.

#### PR plan

| PR | Description | Depends on | Effort |
|----|-------------|------------|--------|
| 1 | Backend CORS + cookie changes | — | S |
| 2 | Vite + React Router scaffold | — | M |
| 3 | Axios API layer | PR 2 | S |
| 4 | Migrate pages and components | PR 3 | M |
| 5 | Socket.IO env var update | PR 2 | S |
| 6 | Static deploy pipeline | PR 1, PR 4 | S |
| 7 | Cleanup — remove Next.js | PR 6 verified | S |

PRs 1 and 2 can be developed in parallel. PR 5 is trivial and can merge alongside PR 4.

---

#### PR 1 — Backend CORS + cookie changes

**Problem:** Today Next.js proxies `/api/*` to the backend, so the browser thinks it's same-origin.
After migration, the browser talks directly to the backend on a different origin. Cookies with
`sameSite: "lax"` won't be sent cross-origin.

**Changes:**
- `auth.routes.ts`: `getCookieOptions()` → use `sameSite: "none"` + `secure: true` in production (cross-origin). Keep `sameSite: "lax"` in development (Vite dev proxy keeps same-origin)
- `main.ts`: CORS middleware — accept frontend origin from `config.frontendUrl`, `credentials: true`
- `socket/index.ts`: Socket.IO CORS origin — same change
- `config.ts`: add `corsOrigins` field (comma-separated list for dev + production flexibility)

**Cookie/domain strategy:**
- Use Cloudflare Pages (not GitHub Pages) so frontend and backend share the same parent domain via Cloudflare routing (e.g. `drawhaus.dev` and `api.drawhaus.dev`). This avoids third-party cookie restrictions.
- Set `domain: ".drawhaus.dev"` on cookies in production so they're shared across subdomains.

---

#### PR 2 — Vite + React Router scaffold

**Goal:** Create the new SPA structure inside `frontend/src/` alongside the existing `app/` directory. Both run on different ports during migration.

**New project structure:**
```
frontend/
├── src/
│   ├── main.tsx                  # Entry point, mounts <App />
│   ├── router.tsx                # React Router route config
│   ├── api/
│   │   ├── client.ts             # axios.create({ baseURL, withCredentials })
│   │   ├── auth.ts               # login, register, logout, getMe, updateProfile, changePassword
│   │   ├── diagrams.ts           # CRUD, search, thumbnail, move
│   │   ├── folders.ts            # CRUD
│   │   ├── share.ts              # create/resolve share links
│   │   └── admin.ts              # metrics, users, settings
│   ├── contexts/
│   │   └── AuthContext.tsx        # AuthProvider: /auth/me on mount, stores user
│   ├── hooks/
│   │   ├── useAuth.ts            # Thin wrapper: useContext(AuthContext)
│   │   └── useCollaboration.ts   # Existing hook, fetch→axios, env vars updated
│   ├── layouts/
│   │   ├── ProtectedLayout.tsx   # useAuth() → redirect if !user, render <Outlet />
│   │   ├── AdminLayout.tsx       # useAuth() → redirect if role !== admin
│   │   ├── AuthLayout.tsx        # useAuth() → redirect if already logged in
│   │   └── AppShell.tsx          # Header, nav, logout (existing, adapted)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Board.tsx
│   │   ├── Settings.tsx
│   │   ├── Share.tsx
│   │   ├── Embed.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminUsers.tsx
│   │   └── AdminSettings.tsx
│   ├── components/               # Existing components, moved
│   │   ├── ExcalidrawCanvas.tsx   # next/dynamic → React.lazy + Suspense
│   │   ├── BoardToolbar.tsx
│   │   ├── CursorOverlay.tsx
│   │   ├── ConnectionBadge.tsx
│   │   ├── ExportMenu.tsx
│   │   └── ...
│   └── lib/
│       ├── ui.ts                 # Design system (as-is)
│       ├── collaboration.ts      # Merge algorithm (as-is)
│       ├── types.ts              # Types (as-is)
│       └── services/
│           └── socket.ts         # NEXT_PUBLIC_WS_URL → VITE_WS_URL
├── index.html                    # Vite entry point
├── vite.config.ts                # React plugin, dev proxy, path aliases
├── .env.example                  # VITE_API_URL, VITE_WS_URL
└── package.json                  # +vite, +react-router-dom, +axios
```

**Route config (`router.tsx`):**
```tsx
<Route element={<AuthLayout />}>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
</Route>
<Route element={<ProtectedLayout />}>
  <Route element={<AppShell />}>
    <Route path="/" element={<Navigate to="/dashboard" />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/board/:id" element={<Board />} />
    <Route path="/settings" element={<Settings />} />
    <Route element={<AdminLayout />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
    </Route>
  </Route>
</Route>
<Route path="/share/:token" element={<Share />} />
<Route path="/embed/:token" element={<Embed />} />
```

**Vite dev proxy** (mirrors `next.config.mjs` rewrites — same-origin in dev, no cookie issues):
```ts
server: {
  proxy: {
    "/api": "http://localhost:4000",
    "/socket.io": { target: "ws://localhost:4000", ws: true }
  }
}
```

**Package changes:**
- Add: `vite`, `@vitejs/plugin-react`, `react-router-dom`, `axios`
- New scripts: `"dev:vite": "vite"`, `"build:vite": "vite build"`, `"preview": "vite preview"`
- Keep Next.js scripts until PR 7

---

#### PR 3 — Axios API layer

**Typed API functions replacing all raw `fetch()` calls.**

`api/client.ts`:
```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  withCredentials: true,
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

**Endpoint files** (one per domain):
- `api/auth.ts` — `login()`, `register()`, `logout()`, `getMe()`, `updateProfile()`, `changePassword()`
- `api/diagrams.ts` — `list()`, `get()`, `create()`, `update()`, `delete()`, `updateThumbnail()`, `move()`, `search()`
- `api/folders.ts` — `list()`, `create()`, `delete()`
- `api/share.ts` — `create()`, `resolve()`
- `api/admin.ts` — `getMetrics()`, `listUsers()`, `updateUser()`, `getSettings()`, `updateSettings()`

The 401 interceptor replaces the server-side `requireUser()` redirect for stale sessions.

---

#### PR 4 — Migrate pages and components

**What moves as-is (zero/trivial changes):**
- `lib/ui.ts`, `lib/types.ts`, `lib/collaboration.ts` — pure exports, no framework deps
- `components/BoardToolbar.tsx`, `CursorOverlay.tsx`, `ConnectionBadge.tsx`, `ExportMenu.tsx` — pure client components

**Mechanical replacements across all files:**
- `import Link from "next/link"` → `import { Link } from "react-router-dom"`
- `import { useRouter } from "next/navigation"` → `import { useNavigate } from "react-router-dom"`
- `router.push(x)` → `navigate(x)`
- `router.refresh()` → re-fetch data or update local state (12+ call sites)
- `import { useParams, useSearchParams } from "next/navigation"` → react-router equivalents
- `fetch("/api/...")` → corresponding `api.*()` call from PR 3
- `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*`

**Components needing specific attention:**

| Component | Change |
|-----------|--------|
| `ExcalidrawCanvas` | `next/dynamic` → `React.lazy` + `<Suspense>` |
| `useCollaboration` | ~7 `fetch()` calls → axios. Env var for WS URL. Largest file (450 lines) |
| Dashboard page | Server component → client page with `useEffect` for data loading |
| Board page | Server fetch of diagram → `useParams()` + `api.diagrams.get()` on mount |
| Settings page | `requireUser()` prop → `useAuth()` context |
| Admin pages | Same: server fetch → client `useEffect` + API calls |
| `AppShell` | `next/link` + `next/navigation` → react-router. Remove `router.refresh()` |
| Fonts | `next/font/local` → `@font-face` in `globals.css` + `<link rel="preload">` in `index.html` |

**`router.refresh()` replacement strategy:**
Each call site is handled individually — after a mutation (create diagram, move to folder, etc.), either:
1. Update local state optimistically (preferred), or
2. Re-call the list function to refresh data

No global state library needed. Each page manages its own data via `useState` + `useEffect`.

---

#### PR 5 — Socket.IO env var update

Tiny PR:
- `socket.ts`: `process.env.NEXT_PUBLIC_WS_URL` → `import.meta.env.VITE_WS_URL`
- No other changes. Socket.IO is already fully client-side.

---

#### PR 6 — Static deploy pipeline

**GitHub Actions workflow** (`.github/workflows/deploy-frontend.yml`):
- Trigger: push to `production` branch (or `main`)
- Steps: checkout → Node 22 → `npm ci` → `VITE_API_URL=... npm run build:vite` → deploy to Cloudflare Pages via `cloudflare/wrangler-action`
- Build-time env vars: `VITE_API_URL`, `VITE_WS_URL` from GitHub secrets

**SPA routing:** Cloudflare Pages natively supports SPA fallback (`/* → /index.html`). No `404.html` hack needed (unlike GitHub Pages).

**Update existing CI:**
- Remove frontend from Docker build matrix in `build-push.yml`
- Remove Kamal frontend deploy step
- Remove `NEXT_PUBLIC_*` build args

---

#### PR 7 — Cleanup: remove Next.js

**Delete:**
- `frontend/app/` (entire Next.js App Router directory)
- `frontend/next.config.mjs`, `frontend/next-env.d.ts`
- `config/deploy.frontend.yml` (Kamal frontend config)
- Frontend `production` stage from `Dockerfile`

**Remove from `package.json`:** `next`, `eslint-config-next`

**Update:**
- `package.json` scripts: `dev` → `vite`, `build` → `vite build`
- `docker-compose.yml`: frontend service uses Vite dev server (port 5173), `VITE_*` env vars
- `Dockerfile`: simplify to dev-only stage for local use
- `tsconfig.json`: remove Next.js plugin, update paths

---

#### Key risk: cross-origin cookies

| Hosting | Cookie behavior | Verdict |
|---------|----------------|---------|
| GitHub Pages (`rodacato.github.io`) + backend (`api.drawhaus.dev`) | Different domains → third-party cookies → blocked by Safari, Chrome | **Avoid** |
| Cloudflare Pages (`drawhaus.dev`) + backend (`api.drawhaus.dev`) | Same parent domain → first-party cookies | **Use this** |
| Cloudflare Pages with `_routes.json` routing `/api/*` to backend | Same origin entirely → no cookie changes needed | **Even better** |

**Recommendation:** Cloudflare Pages with either subdomain routing or Cloudflare Workers for API proxying. This avoids all cookie headaches.

---

#### Smoke test checklist (per PR)

- [ ] Login / register / logout flow
- [ ] Dashboard: list, create, import, search, folder CRUD, move diagram
- [ ] Board: load, draw, auto-save, collab (two tabs), cursors, presence, share links
- [ ] Settings: update profile, change password
- [ ] Admin: metrics, user management, site settings
- [ ] Share link: guest name, view/edit mode, collaboration
- [ ] Embed: read-only view
- [ ] Cross-origin cookies in production (most likely bug source)

### Phase 4 — Collaboration Depth

> Goal: Async collaboration features.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 16 | Comments | Element-anchored threads, notifications | M |
| 17 | Teams / workspaces | Team entity, invite flow, shared folders | M |
| 18 | Activity feed | Recent changes per diagram, who edited what | M |
| 19 | Audit log | Share link access tracking, admin visibility | S |

### Phase 5 — Power Features

> Goal: Things that would genuinely improve daily use. Scope TBD.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 20 | Versioning | Track diagram history over time, revert to previous versions | M |
| 21 | PDF/PPTX export | Export scenes as presentation-ready files | M |
| 22 | Presentations | Scene-based slideshow mode | M |
| 23 | Libraries | Reusable component library (personal, synced across diagrams) | M |

### Phase 6 — Stretch / Explore

> Goal: High-value features worth exploring once the core is solid.

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 24 | AI assist | Generate diagrams from text prompts (Claude API) | L |
| 25 | MCP server | Expose Drawhaus to AI agents for automated diagram creation | M |
| 26 | Public API | REST API for external integrations, automation | M |
| 27 | Archive / soft delete | Archive diagrams instead of permanent delete | S |

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
| Versioning | In progress | Yes | Phase 5 (#20) — snapshot-based, timeline UI |
| PDF/PPTX export | Shipped | Yes | Phase 5 (#21) — after multi-scene |
| MCP (agent integration) | Backlog | Yes | Phase 6 (#25) — unique for self-hosted |
| Public API | In progress | Yes | Phase 6 (#26) — enables MCP and automation |
| Archive (soft delete) | In progress | Yes | Phase 6 (#27) — `deleted_at` column, simple |
| Generate anything (AI) | In progress | Maybe | Phase 6 (#24) — explore after core is solid |
| Nesting with folders | Backlog | Yes | Phase 2 (#7) — already planned |
| Shared library | Backlog | Low | Phase 5 (#23) — personal library only |
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
| Versioning over comments | Versioning in Phase 5 | Comments first | Personal use: "what did this look like before?" > async discussion |
| Axios over fetch | axios with configured instance | Raw `fetch()` everywhere | Interceptors, base URL config, cleaner error handling, `withCredentials` by default |
| Snapshot versioning | Full JSONB snapshots | Event-sourced diffs | Simpler, storage is cheap for personal volume |
| Static SPA over Next.js | Vite + React Router in Phase 3 | Keep Next.js | No feature requires SSR; Next.js adds unnecessary server complexity for a tool behind auth |
| Cloudflare Pages over GitHub Pages | Same parent domain for cookies | GitHub Pages (different domain) | Avoids third-party cookie restrictions; Cloudflare natively supports SPA routing |
| No global state library | AuthContext + local state + hooks | Zustand/Redux | App has no complex global state; auth context + per-page data loading is sufficient |
| MCP as differentiator | Explore in Phase 5 | Skip AI integration | Unique angle: AI agents creating diagrams on own server |

---

*Last updated: 2026-03-08*
