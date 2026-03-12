# Security & Code Quality Improvement Plan

## Overview

With 155+ E2E tests in place, this document outlines the plan for reducing code complexity, increasing quality/resilience, and hardening security across the Drawhaus codebase.

---

## Phase 1: Security Fixes (Immediate Priority)

### 1A. Google Drive Query Injection
- **File**: `backend/src/infrastructure/services/google-drive-service.ts`
- **Issue**: `name` and `parentId` are interpolated without escaping into Google Drive QL queries
- **Fix**: Create `escapeDriveQL()` helper that escapes single quotes, apply in `findFolder` and `listFiles`
- **Severity**: HIGH

### 1B. Workspace Folder Authorization Bypass
- **Files**: `backend/src/application/use-cases/folders/list-folders.ts`, `create-folder.ts`
- **Issue**: These use cases don't verify that the user is a member of the workspace before listing/creating folders
- **Fix**: Inject `WorkspaceRepository`, verify membership, throw `ForbiddenError` if not a member
- **Also modify**: `backend/src/main.ts` to pass the repo to use case constructors
- **Severity**: CRITICAL

### 1C. Security Headers (Helmet)
- **File**: `backend/src/main.ts`
- **Issue**: No security headers middleware — missing X-Content-Type-Options, X-Frame-Options, HSTS, CSP
- **Fix**: `npm install helmet`, add `app.use(helmet())` with CSP config compatible with Excalidraw/Socket.io
- **Risk**: CSP may block Excalidraw inline styles — requires careful configuration
- **Severity**: HIGH

### 1D. Rate Limiting on Auth Endpoints
- **New file**: `backend/src/infrastructure/http/middleware/rate-limit.ts`
- **Issue**: No brute force protection on `/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`
- **Fix**: `npm install express-rate-limit`, create `authLimiter` (10 req/15min) and `apiLimiter` (100 req/15min)
- **Apply in**: `backend/src/main.ts`
- **Severity**: HIGH

### 1E. Cookie Options Deduplication
- **File**: `backend/src/infrastructure/http/routes/auth.routes.ts`
- **Issue**: Cookie options duplicated 3+ times across set/clear cookie calls
- **Fix**: Extract `getClearCookieOptions()` and reuse across all `clearCookie` and OAuth state cookies
- **Severity**: LOW (code quality)

---

## Phase 2: Backend Code Quality & Deduplication

### 2A. Permission Check Helper
- **New file**: `backend/src/application/helpers/require-access.ts`
- **Issue**: The pattern `findAccessRole → NotFoundError → ForbiddenError` is duplicated across 45+ use cases
- **Fix**: Export `requireAccess()`, `requireEditAccess()`, `requireOwnerAccess()` helpers
- **Refactor**: All use cases that repeat this pattern

### 2B. Route Validation Middleware
- **New file**: `backend/src/infrastructure/http/middleware/validate.ts`
- **Issue**: `schema.safeParse(req.body); if (!parsed.success) return 400` repeated ~30 times across 9 route files
- **Fix**: Export `validate(schema)` middleware factory
- **Refactor**: All route files to use the middleware

### 2C. Composition Root Refactoring
- **New files**:
  - `backend/src/composition/repositories.ts`
  - `backend/src/composition/services.ts`
  - `backend/src/composition/use-cases.ts`
  - `backend/src/composition/index.ts`
- **Issue**: `main.ts` is 326 lines with 60+ use case instantiations
- **Fix**: Extract dependency wiring into composition modules, reduce `main.ts` to ~100 lines

---

## Phase 3: Frontend Complexity Reduction

### 3A. Split BoardSidebar.tsx (614 → ~120 lines)
- **New files in** `frontend/src/components/board-sidebar/`:
  - `ExportPanel.tsx` (~140 lines)
  - `SharePanel.tsx` (~140 lines)
  - `SettingsPanel.tsx` (~25 lines)
  - `SidebarButton.tsx` (~40 lines)
  - `icons.tsx` (~60 lines)
  - `index.ts` (barrel export)

### 3B. Split useCollaboration.ts (568 → ~100 lines)
- **New files in** `frontend/src/lib/hooks/collaboration/`:
  - `useSocketConnection.ts` — socket lifecycle (~120 lines)
  - `useSaveManager.ts` — debounce/throttle/persist (~100 lines)
  - `usePresence.ts` — cursor tracking (~60 lines)
  - `useSceneManager.ts` — scene CRUD (~80 lines)
  - `types.ts` — shared types

### 3C. Shared Diagram Types & Tag Rendering
- **New files**:
  - `frontend/src/components/shared/DiagramTypes.ts`
  - `frontend/src/components/shared/TagBadges.tsx`
- **Issue**: `DiagramCard.tsx` and `DiagramListRow.tsx` have identical type definitions and tag rendering
- **Fix**: Extract shared type and `TagBadges` component

---

## Phase 4: Frontend API Layer Cleanup

### 4A. Axios Response Interceptor
- **File**: `frontend/src/api/client.ts`
- **Issue**: `.then((r) => r.data)` repeated 55+ times across 9 API files
- **Fix**: Add response interceptor to auto-unwrap `r.data`
- **Refactor**: Remove all `.then((r) => r.data)` calls
- **Caution**: Verify no caller uses `response.status` or `response.headers`

---

## Phase 5: Error Boundaries & Resilience

### 5A. React Error Boundary
- **New files**:
  - `frontend/src/components/ErrorBoundary.tsx`
  - `frontend/src/components/BoardErrorFallback.tsx`
- **File to modify**: `frontend/src/pages/Board.tsx` — wrap `<BoardEditor>` in `<ErrorBoundary>`

### 5B. Database Transactions
- **File**: `backend/src/infrastructure/db.ts`
- **Issue**: Multi-step operations (workspace create + member add) are not atomic — race condition risk
- **Fix**: Add `withTransaction<T>(fn)` helper with BEGIN/COMMIT/ROLLBACK
- **Apply in**: `PgWorkspaceRepository.create()` for atomic workspace + member insertion

---

## Phase 6: Audit Logging

### 6A. Structured Audit Logger
- **New files**:
  - `backend/src/domain/ports/audit-logger.ts` (interface)
  - `backend/src/infrastructure/services/audit-logger.ts` (implementation)
- **Inject into**: `LoginUseCase`, `DeleteAccountUseCase`, `AdminUpdateUserUseCase`, `AdminDeleteUserUseCase`, workspace member use cases
- **Log fields**: actor, action, target, timestamp, IP

---

## Risk & Verification Matrix

| Phase | Risk | Verification |
|-------|------|-------------|
| 1A-1B | Low | Existing E2E tests + new unit tests |
| 1C | Medium | Full E2E suite (CSP may break Excalidraw) |
| 1D | Low | E2E + manual rate limit test |
| 2A-2C | Low | Full E2E (mechanical refactoring) |
| 3A-3C | Low-Medium | Board editor & collaboration E2E tests |
| 4A | Medium | Full E2E suite (changes all API calls) |
| 5A-5B | Low | E2E + manual error boundary test |
| 6A | Low | Verify logs after E2E run |

## Strategy

- Each phase is an independent PR
- Run full E2E suite after each phase
- Phase 1 is highest priority (security vulnerabilities)
- Phases 2-6 can be parallelized across developers
