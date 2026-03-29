# Architecture

> Everything you need to understand the system before writing a line of code.
> This document answers: "How does Drawhaus work and why was it built this way?"

---

## Ecosystem

```
drawhaus.dev              # this repo — monorepo with frontend, backend, and shared packages
  ├── apps/backend        # Express API + Socket.IO server
  ├── apps/frontend       # React SPA (Excalidraw editor)
  ├── packages/helpers    # Element builders, layout engine, merge utilities
  ├── packages/mcp        # MCP server for AI agents
  ├── packages/plantuml-to-excalidraw  # PlantUML → Excalidraw converter
  └── packages/mermaid-to-excalidraw   # Mermaid → Excalidraw converter
```

External dependencies: Google OAuth, GitHub OAuth, Google Drive API, Resend (email), Honeybadger (error monitoring). All optional — the system runs standalone without any of them.

---

## System Overview

```
[Browser]
    │
    ├── HTTPS ──────────────────────────┐
    │                                   ▼
    │                          [Frontend — React + Vite]
    │                            Excalidraw editor
    │                            React Router SPA
    │
    ├── REST /api/* ────────────┐
    ├── WebSocket (Socket.IO) ──┤
    │                           ▼
    │                  [Backend — Express + Socket.IO]
    │                    Zod validation
    │                    Session auth (cookies)
    │                    Composition root (manual DI)
    │                           │
    │                     ┌─────┴─────┐
    │                     ▼           ▼
    │               [PostgreSQL]  [Redis (optional)]
    │                  JSONB        Session adapter
    │                  Migrations   Rate limiting
    │                               Socket.IO adapter
    │
    ├── REST /v1/* ─────────────┐
    │   (API key auth)          ▼
    │                  [Public API — Express]
    │                    OpenAPI docs (Redocly)
    │
    └── MCP protocol ───────────┐
                                ▼
                       [@drawhaus/mcp]
                         5 tools, 2 resources
                         Uses /v1/ API internally
```

Three entry points reach the backend: the React SPA (via REST + WebSocket), external clients (via the `/v1/` public API with API key auth), and AI agents (via MCP server, which wraps the public API). All three share the same use cases and domain layer.

Real-time collaboration uses Socket.IO with msgpack encoding (~30% smaller than JSON) and optional Redis adapter for horizontal scaling. Scene syncing uses element-level deltas — only changed/removed elements are broadcast, reducing payload by ~80%.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | TypeScript (full stack) | Type safety, single language across the monorepo |
| Runtime | Node.js | Ecosystem, Socket.IO native support |
| Backend framework | Express | Mature, familiar, vast middleware ecosystem |
| Real-time | Socket.IO + msgpack | Binary encoding, room model, automatic reconnection, Redis adapter for scaling |
| Database | PostgreSQL | Proven, JSONB for Excalidraw elements, strong transaction support |
| Cache / Pub-Sub | Redis (optional) | Rate limiting, Socket.IO adapter, snapshot deduplication. Falls back to in-memory |
| Frontend framework | React 18 | Excalidraw is React-based — no choice here |
| Build tool | Vite | Fast HMR, ESM-native, simple config |
| Styling | Tailwind CSS 4 | Utility-first, rapid iteration |
| Router | React Router v7 | Standard for React SPAs |
| Editor | @excalidraw/excalidraw v0.18 | The whole point — best open-source drawing tool |
| Auth | Session cookies (httpOnly, SameSite=Lax) | Simple, secure, no JWT complexity ([ADR-017]) |
| Validation | Zod | Runtime + compile-time safety on all inputs |
| Email | Resend | Simple API, good DX. Optional — logs to console if not configured |
| Deployment | Kamal + Docker + GHCR | Zero-downtime deploys, self-hosted on any VPS |
| Monorepo | npm workspaces | No extra tooling (Turborepo, Nx) — keeps it simple |
| Migrations | node-pg-migrate | SQL-based, explicit, no ORM magic |
| Error monitoring | Honeybadger | Optional, disabled if API key not set |

---

## Architecture Style

**Clean Architecture** — three strict layers with enforced dependency direction:

```
Domain (entities, ports, errors — zero framework imports)
    ↑ depends on nothing
Application (use cases — orchestrates domain, calls ports)
    ↑ depends only on domain
Infrastructure (routes, repos, services, socket handlers — implements ports)
    ↑ depends on application + domain
```

This was chosen ([ADR-002]) because:

- **The domain is real but not complex enough for full DDD.** Drawhaus has entities (Diagram, Workspace, User, Scene, Comment, Snapshot) with meaningful invariants, but no deep aggregate hierarchies or bounded contexts that would justify DDD overhead.
- **Clean separation enables testability.** Use cases are framework-agnostic — they depend on port interfaces, not PostgreSQL or Express.
- **No DI container.** A manual [composition root](../apps/backend/src/composition/index.ts) wires everything at startup. Dependencies are explicit, no hidden injections.

The project intentionally avoids bounded contexts, domain events, and event sourcing. Contexts are separated by feature (auth, diagrams, workspaces, comments, etc.) but not formally bounded — they share the same database and import each other's ports freely.

---

## Directory Structure

```
/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── domain/              # Entities, port interfaces, custom errors
│   │       │   ├── entities/        # User, Diagram, Scene, Workspace, Comment, etc.
│   │       │   ├── ports/           # Repository + service interfaces (24 files)
│   │       │   └── errors/          # Domain-specific error classes
│   │       ├── application/
│   │       │   └── use-cases/       # One file per use case (~91 files)
│   │       ├── infrastructure/
│   │       │   ├── http/
│   │       │   │   ├── routes/      # Express route handlers (15 files)
│   │       │   │   └── middleware/  # Auth, validation, rate limiting, etc.
│   │       │   ├── repositories/    # PostgreSQL implementations (18 files)
│   │       │   ├── services/        # Email, encryption, Drive, audit, backups
│   │       │   ├── socket/          # Socket.IO server + handlers (6 files)
│   │       │   └── public-api/      # /v1/ routes with API key auth
│   │       ├── composition/         # Dependency wiring (composition root)
│   │       ├── migrations/          # SQL migration files
│   │       ├── __tests__/           # Unit + integration tests (139 tests)
│   │       └── main.ts              # Server bootstrap
│   └── frontend/
│       └── src/
│           ├── api/                 # Axios API clients (14 files)
│           ├── components/          # Reusable UI components (35+ files)
│           ├── contexts/            # AuthContext, ThemeContext
│           ├── hooks/               # useCollaboration, useDiagramActions, etc.
│           ├── layouts/             # AuthLayout, ProtectedLayout, AppShell
│           ├── pages/               # Route components
│           ├── lib/                 # Collaboration, services, types, converters
│           ├── router.tsx           # Route definitions
│           └── main.tsx             # React root
├── packages/
│   ├── helpers/                     # Element builders, layout, merge, validator, spec
│   ├── mcp/                         # MCP server (5 tools, 2 resources)
│   ├── plantuml-to-excalidraw/      # PlantUML → Excalidraw elements
│   └── mermaid-to-excalidraw/       # Mermaid → Excalidraw elements
├── e2e/                             # Playwright end-to-end tests
├── config/                          # Kamal deploy configs
└── docs/                            # Vision, roadmap, ADRs, specs, guides
```

The structure mirrors the architecture: `domain/` has no framework imports, `application/` depends only on domain ports, `infrastructure/` implements those ports with concrete technologies. The `composition/` folder wires it all together at startup.

---

## Ports & Adapters

### Ports (interfaces in `domain/ports/`)

The domain defines 24 port interfaces. Key ones:

```typescript
// Repository ports — data persistence
interface DiagramRepository {
  create(diagram: Diagram): Promise<Diagram>
  findById(id: string): Promise<Diagram | null>
  findByWorkspace(workspaceId: string, options: ListOptions): Promise<Diagram[]>
  update(id: string, fields: Partial<Diagram>): Promise<Diagram>
  delete(id: string): Promise<void>
  // ...
}

interface UserRepository { /* ... */ }
interface WorkspaceRepository { /* ... */ }
interface SceneRepository { /* ... */ }
interface CommentRepository { /* ... */ }
interface SnapshotRepository { /* ... */ }
interface SessionRepository { /* ... */ }

// Service ports — external capabilities
interface EmailService {
  sendInvite(to: string, inviteUrl: string): Promise<void>
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
}

interface EncryptionService {
  encrypt(plaintext: string): string
  decrypt(ciphertext: string): string
}

interface DriveService {
  exportFile(tokens: OAuthTokens, file: DriveFile): Promise<void>
  importFile(tokens: OAuthTokens, fileId: string): Promise<DriveFile>
}
```

### Adapters (implementations in `infrastructure/`)

| Port | Adapter | Notes |
|------|---------|-------|
| DiagramRepository | `PgDiagramRepository` | PostgreSQL + JSONB for elements |
| UserRepository | `PgUserRepository` | bcrypt password hashing |
| SessionRepository | `PgSessionRepository` | 30-day TTL, database-backed |
| WorkspaceRepository | `PgWorkspaceRepository` | With member role queries |
| SceneRepository | `PgSceneRepository` | JSONB elements + app_state |
| EmailService | `ResendEmailService` | Falls back to console.log |
| EncryptionService | `AesEncryptionService` | AES-256-GCM, requires ENCRYPTION_KEY |
| DriveService | `GoogleDriveService` | OAuth token refresh handled separately |

---

## Application Layer (Use Cases)

~91 use cases, one per file, organized by feature. Each use case receives its dependencies via constructor injection from the composition root.

```typescript
// Example: CreateDiagram
class CreateDiagram {
  constructor(
    private diagramRepo: DiagramRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute(userId: string, input: CreateDiagramInput): Promise<Diagram> {
    // 1. Verify user has editor+ role in workspace
    // 2. Create diagram entity
    // 3. Persist via repository port
    // 4. Return created diagram
  }
}
```

Use cases do NOT contain:
- HTTP/Express concerns (that's routes)
- SQL queries (that's repositories)
- Socket.IO events (that's socket handlers)

Use cases DO contain:
- Authorization checks (`requireAccess()`)
- Business rule enforcement
- Orchestration of multiple repositories/services

---

## Request Flow

### HTTP Request (REST API)

```
HTTP Request
  │
  ▼
┌─────────────────────────────────────┐
│  Express Middleware Chain             │
│  1. Helmet (security headers)        │
│  2. CORS (origin lock)               │
│  3. Body parsing                     │
│  4. Request ID (UUID)                │
│  5. Request logging                  │
│  6. Rate limiting                    │
│  7. Session auth (require-auth)      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Route Handler                       │
│  1. Zod validation (body/query/params)│
│  2. Call use case                    │
│  3. Map response                     │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Error Handler                       │
│  • Maps domain errors → HTTP status  │
│  • Honeybadger reporting (optional)  │
└─────────────────────────────────────┘
```

### WebSocket Connection (Real-time)

```
Socket.IO Handshake
  │  (session cookie OR share token)
  ▼
┌─────────────────────────────────────┐
│  Socket Auth Middleware              │
│  Validates session or share token    │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Room Model (two-tier)               │
│                                      │
│  diagram:{id}                        │
│    ├── presence (who's online)       │
│    ├── comments                      │
│    └── snapshots                     │
│                                      │
│  diagram:{id}:scene:{sceneId}        │
│    ├── element sync (deltas)         │
│    ├── cursors (volatile)            │
│    └── viewports (volatile)          │
└─────────────────────────────────────┘
```

---

## Auth

### Session-Based Authentication

```
Login: POST /api/auth/login
  → bcrypt compare password
  → Generate session ID (crypto.randomUUID)
  → Store in sessions table (user_id, expires_at = +30 days)
  → Set-Cookie: drawhaus_session=<id>; HttpOnly; SameSite=Lax; Secure

Subsequent requests:
  → Cookie sent automatically
  → require-auth middleware: session lookup → attach user to request
  → 401 if invalid/expired, 403 if user disabled
```

**OAuth flow** (Google / GitHub):
1. Redirect to provider consent screen
2. Callback exchanges code for tokens
3. Tokens encrypted with AES-256-GCM, stored in `oauth_tokens` table
4. Creates or links user account (matched by email)
5. Sets session cookie

**No CSRF tokens** ([ADR-017]): SameSite=Lax + CORS origin lock + httpOnly cookies make traditional CSRF attacks impractical for an SPA.

### Role-Based Access Control

| Scope | Roles | Notes |
|-------|-------|-------|
| System | `user`, `admin` | Admin: manage users, metrics, site settings |
| Workspace | `owner`, `admin`, `editor`, `viewer` | Inherited by all diagrams in workspace |
| Share link | `editor`, `viewer` | Guest access with optional expiration |

**Access resolution order:**
1. Diagram owner → full access
2. Workspace member → use workspace role
3. Share link holder → use share role
4. None → 403

---

## Real-time Collaboration

### Concurrent Editing Strategy ([ADR-022])

**No locks.** Element-level merge with version-based conflict resolution:

- Each element has `id` (UUID) + `version` (monotonic counter)
- `scene-delta` events transmit only changed/removed elements
- `mergeElements()`: higher version wins on conflict
- Delete wins: deleted elements removed for all users
- Server-side save: `SELECT ... FOR UPDATE` in PostgreSQL transaction
- Orphan cleanup: arrow bindings and group memberships auto-cleaned

**Trade-off:** Two users editing the same element simultaneously — one overwrites. Acceptable for <10 concurrent editors. Users see live cursors, so they naturally avoid conflicts. Toast notifications inform of overwrites.

**Future path:** Yjs/CRDT deferred until demand for 10+ concurrent editors ([ADR-022]).

### Throttling

| Event | Rate | Notes |
|-------|------|-------|
| Scene updates | 50ms (100ms if >200 elements) | Adaptive throttling |
| Cursors | 30ms | Volatile — acceptable loss |
| Viewports | 100ms | Volatile — acceptable loss |
| Save to DB | 1200ms debounce | REST fallback if socket disconnects |
| Comments | 10 req/s | Standard rate limit |

---

## Shared Packages

### @drawhaus/helpers

Shared by backend, frontend, and MCP server. Core exports:

| Export | Purpose |
|--------|---------|
| `createRect`, `createText`, `createArrow`, ... | Element builders for programmatic diagram creation |
| `layoutGraph({ nodes, edges, direction })` | Dagre-based automatic layout |
| `mergeElements`, `mergeDelta`, `diffElements` | Version-based conflict resolution |
| `validateElements`, `normalizeElements` | Zod-based Excalidraw element validation |
| `EXCALIDRAW_SPEC`, `getSpecForPrompt()` | Curated spec for AI agents |
| `DIAGRAM_STYLES` | Bauhaus design system (colors, fonts) |

### @drawhaus/mcp

MCP server for AI agents (Claude Code, Cursor, VS Code):

| Tool | Description |
|------|-------------|
| `create_diagram` | Generate diagram from description or elements array |
| `list_diagrams` | Browse workspace diagrams |
| `get_diagram` | Read elements + metadata |
| `update_diagram` | Modify existing diagram |
| `validate_elements` | Check against Excalidraw spec |

### Diagram-as-Code Converters

- **@drawhaus/plantuml-to-excalidraw**: 14+ diagram types → editable elements
- **@drawhaus/mermaid-to-excalidraw**: 10+ diagram types → editable elements

Both used by the frontend's Live Import feature and available as standalone packages.

---

## External Dependencies

| Dependency | Purpose | Criticality | Failure Mode |
|-----------|---------|-------------|-------------|
| PostgreSQL | Primary data store | **Critical** | App won't start |
| Redis | Socket adapter, rate limiting, dedup | Low | Falls back to in-memory |
| Google OAuth | Login + Drive integration | Low | Users use email/password instead |
| GitHub OAuth | Login | Low | Users use email/password instead |
| Google Drive | Export/import/auto-backup | Low | Feature disabled gracefully |
| Resend | Email invites + password reset | Low | Logs to console |
| Honeybadger | Error monitoring | None | No error reporting |

---

## Key Design Decisions

Formal ADRs live in [docs/adr/](adr/). Key decisions summarized:

**Clean Architecture over MVC** ([ADR-002])
Three strict layers with dependency inversion. No DI container — manual composition root. Overhead is justified by testability and the ability to swap infrastructure without touching business logic.

**Workspaces over per-diagram collaborators** ([ADR-010])
Workspace-level roles inherited by all diagrams. Cleaner for the target use case (small teams, contractors). Share links override for one-off guest access.

**Element-level merge over locks** ([ADR-022])
Replaced the original global edit lock ([ADR-006], [ADR-020]). Version-based merge allows true concurrent editing. Acceptable for <10 users; CRDT deferred.

**Socket.IO with msgpack** ([ADR-007])
Binary encoding for ~30% payload reduction. Two-tier room model (diagram + scene). Redis adapter for optional horizontal scaling.

**Full JSONB snapshots over event sourcing** ([ADR-009])
Complete element array per snapshot. Simpler to query, restore, and reason about. Storage is cheap.

**Session cookies over JWT** ([ADR-017])
HttpOnly + SameSite=Lax. No CSRF tokens needed. Simpler than JWT refresh token rotation.

**Hybrid secrets: env + encrypted DB** ([ADR-012])
Infrastructure secrets (DATABASE_URL) in env vars. Feature secrets (OAuth keys) encrypted in DB — admins update without server restart.

**Monorepo with npm workspaces** ([ADR-016])
Apps and packages in one repo. Packages publishable to npm independently. No extra tooling (Turborepo/Nx).

---

## Deployment

```
yourdomain.com              api.yourdomain.com
       │                           │
       ▼                           ▼
    ┌─────────────────────────────────┐
    │      Kamal Proxy                │
    │  (routes by host header)        │
    └──────┬──────────────┬───────────┘
           │              │
       Nginx (SPA)   Express + Socket.IO
         :80              :4000
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
               PostgreSQL         Redis (optional)
                 :5432              :6379
```

- **Deploy tool:** Kamal (zero-downtime Docker deploys)
- **Registry:** GitHub Container Registry (GHCR)
- **CI/CD:** GitHub Actions → build images → push to GHCR → deploy via Kamal
- **Trigger:** Push to `production` branch
- **Pre-migration:** Automatic DB backup before running migrations on production
- **First deploy:** `kamal setup` from local machine

---

## Security Summary

| Concern | Approach |
|---------|----------|
| Authentication | Session cookies, HttpOnly, SameSite=Lax, 30-day TTL |
| Password storage | bcrypt hashing |
| CSRF | Not needed — SameSite=Lax + CORS origin lock ([ADR-017]) |
| Input validation | Zod schemas on all routes |
| Authorization | RBAC with workspace roles + share link roles |
| Secret storage | AES-256-GCM encryption for integration secrets in DB |
| Rate limiting | Per-bucket limits (auth: 5/15min, API: 100/15min, sockets: 30-60/s) |
| Headers | Helmet (CSP, HSTS, X-Frame-Options) |
| Error monitoring | Honeybadger (optional) |
| Audit logging | `audit-logger` service for admin-visible events |

---

[ADR-002]: adr/002-clean-architecture.md
[ADR-006]: adr/006-edit-lock.md
[ADR-007]: adr/007-socketio-msgpack.md
[ADR-009]: adr/009-jsonb-snapshots.md
[ADR-010]: adr/010-workspaces.md
[ADR-012]: adr/012-hybrid-secrets.md
[ADR-016]: adr/016-monorepo.md
[ADR-017]: adr/017-no-csrf-tokens.md
[ADR-020]: adr/020-edit-lock-v2.md
[ADR-022]: adr/022-concurrent-editing.md
