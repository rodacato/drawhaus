# Backup All to Google Drive — Implementation Plan

## Context

Manual "Backup All" action from user Settings that syncs all diagrams in the active workspace to Google Drive, respecting folder structure, with real-time progress. Workspaces are implemented (v0.7).

## Architecture

- **Backend**: New use case + POST endpoint returning 202. Progress delivered via socket.io.
- **Frontend**: `BackupAllButton` component inside `DriveIntegrationCard` with progress bar.

---

## Scope

### What it does
- Backs up all diagrams in the user's **active workspace** to Google Drive
- Creates folder structure: `Drawhaus Backups/{WorkspaceName}/{FolderName}/diagram.excalidraw`
- Upsert: updates existing Drive files, creates new ones
- Shows real-time progress: "Backing up 10 of 100..."
- Manual action from Settings, requires confirmation

### What it doesn't do (v1)
- No scheduled/automatic backup-all
- No cancel mid-backup (backend continues if user navigates away)
- No cross-workspace backup (one workspace at a time)

---

## Pre-requisite: Align single-sync folder structure

> **Why**: Current `sync-to-drive.ts` uses `Drawhaus Backups/{FolderName}/` without workspace context. Backup-all uses `Drawhaus Backups/{WorkspaceName}/{FolderName}/`. If both coexist, the same diagram ends up in two different Drive locations.

**Before implementing backup-all**, update `sync-to-drive.ts` to:
1. Lookup the diagram's workspace name
2. Use `Drawhaus Backups/{WorkspaceName}/{FolderName}/` as the Drive path
3. This is a minor change — add workspace lookup to the existing flow

---

## Files to Create

### 1. `backend/src/application/use-cases/drive/backup-all-to-drive.ts`

New use case: `BackupAllToDriveUseCase`

**Dependencies** (constructor injection):
- `driveService: GoogleDriveService`
- `driveBackupRepo: DriveBackupRepository`
- `tokenRefresher: GoogleTokenRefresher`
- `diagrams: DiagramRepository`
- `scenes: SceneRepository`
- `folders: FolderRepository`
- `workspaces: WorkspaceRepository`

**Flow:**
1. Refresh OAuth token once
2. Ensure `Drawhaus Backups` root folder in Drive
3. Ensure workspace subfolder: `Drawhaus Backups/{WorkspaceName}/`
4. Load all workspace folders → pre-create Drive subfolders (+ "Unfiled"). Cache `Map<localFolderId, driveFolderId>`
5. Load all diagrams in workspace + their scenes
6. Process with **concurrency limit of 3** (promise pool):
   - Build `.excalidraw` JSON (same format as `sync-to-drive.ts`)
   - Lookup existing mapping in `drive_file_mappings`
   - Upload/update via `driveService.uploadFile`
   - Upsert file mapping in DB
   - Call `onProgress()` callback
   - On per-item failure: catch, increment fail count, continue
7. Return `BackupResult`

**Guard:** In-memory `Set<userId>` prevents concurrent backup jobs. Return 409 if already running. Note: single-server only — acceptable for self-hosted scope, document this limitation.

**Token refresh:** Max **1 token refresh per job** (not per-item). On first 401, refresh token and continue. If the refreshed token also fails, abort the entire job with error. This prevents infinite 401 → refresh loops that could exhaust refresh tokens.

**Types:**
```ts
type BackupProgress = {
  completed: number;
  total: number;
  currentDiagram: string; // title
  failed: number;
};

type BackupResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ diagramId: string; title: string; error: string }>; // capped at 50
};
```

### 2. `frontend/src/components/BackupAllButton.tsx`

**States:** idle → confirming → in-progress → complete → (resets to idle)

| State | UI |
|---|---|
| idle | "Backup All to Drive" button (secondary style) |
| confirming | Warning text + diagram count + "Start Backup" / "Cancel" buttons |
| in-progress | Progress bar + "Backing up 10 of 100..." + current diagram name |
| complete | Summary: "98 of 100 succeeded" + expandable error list + "Done" button |
| error | Error message + "Retry" button |

Error messages in the expandable list must be user-facing ("File too large", "Drive quota exceeded"), not raw stack traces.

**Socket lifecycle:**
1. On "Start Backup" click → create temporary socket via `createSocket()`
2. Emit `join-user-room` to join `user:<userId>` room
3. Call `driveApi.backupAll(workspaceId)` (POST, returns 202 with `{ jobId, totalDiagrams }`)
4. Listen for `drive-backup-progress`, `drive-backup-complete`, `drive-backup-error`
5. On complete/error → disconnect socket
6. On unmount → disconnect socket (cleanup)

**Reconnection on page revisit:**
- On mount, call `GET /api/drive/backup-status` to check if a backup is running
- If running: reconnect socket, show in-progress state with current progress
- If not running: show idle state

---

## Files to Modify

### 3. `backend/src/infrastructure/http/routes/drive.routes.ts`

- Accept `io: Server` parameter in `createDriveRoutes`
- Add routes:

```
POST /api/drive/backup-all
Body: { workspaceId: string }
Response: 202 { jobId: string, totalDiagrams: number }

GET /api/drive/backup-status
Response: 200 { running: boolean, progress?: BackupProgress }
```

- **Authorization**: Validates Drive connected, user is member of workspace with role `editor` or `admin` (viewers cannot trigger backups — they consume Drive quota)
- Fire-and-forget: calls `execute()` with `onProgress` that emits socket events
- On complete: emits `drive-backup-complete`
- On error: emits `drive-backup-error`

### 4. `backend/src/infrastructure/socket/index.ts`

Add `join-user-room` event handler:
```ts
socket.on("join-user-room", async () => {
  // authenticate via session cookie — reuse parseCookieSession from existing socket setup
  // join socket to room `user:<userId>`
});
```

### 5. `backend/src/main.ts`

- Instantiate `BackupAllToDriveUseCase` with repos/services
- Pass `io` to `createDriveRoutes`
- Pass `sessionRepo` to socket setup for `join-user-room` auth

### 6. `frontend/src/api/drive.ts`

Add methods:
```ts
backupAll: (workspaceId: string) =>
  api.post("/api/drive/backup-all", { workspaceId }),

backupStatus: () =>
  api.get("/api/drive/backup-status").then((r) => r.data),
```

### 7. `frontend/src/components/DriveIntegrationCard.tsx`

- Import and render `<BackupAllButton />` when Drive is connected
- Pass `workspaceId` from current workspace context (read from `localStorage("drawhaus_workspace")`)

### 8. `backend/src/application/use-cases/drive/sync-to-drive.ts` (pre-requisite)

- Add `workspaces: WorkspaceRepository` dependency
- Lookup workspace name from `diagram.workspaceId`
- Change Drive path from `Drawhaus Backups/{FolderName}/` to `Drawhaus Backups/{WorkspaceName}/{FolderName}/`
- Fallback: if workspace is null or personal, use `Drawhaus Backups/Personal/{FolderName}/`

---

## Socket Events

| Event | Direction | Payload |
|---|---|---|
| `join-user-room` | client → server | (none, auth via cookie) |
| `drive-backup-progress` | server → client | `{ jobId, completed, total, currentDiagram, failed }` |
| `drive-backup-complete` | server → client | `{ jobId, total, succeeded, failed, errors[] }` |
| `drive-backup-error` | server → client | `{ jobId, error: string }` |

---

## Drive Folder Structure

```
Google Drive/
└── Drawhaus Backups/
    ├── Personal/
    │   ├── {Folder A}/
    │   │   └── diagram-1.excalidraw
    │   └── Unfiled/
    │       └── diagram-2.excalidraw
    └── {Workspace Name}/
        ├── {Folder B}/
        │   ├── diagram-3.excalidraw
        │   └── diagram-4.excalidraw
        └── Unfiled/
            └── diagram-5.excalidraw
```

---

## Rate Limits & Performance

- Google Drive API: ~12,000 req/day, ~10 req/sec per user
- Concurrency of 3 → ~3 req/sec (well within limits)
- Folder creation: done upfront (1 API call per unique folder, typically 1-15)
- File upload: 1 API call per diagram/scene
- **100 diagrams ≈ 115 API calls ≈ ~35 seconds**

---

## Edge Cases

| Case | Handling |
|---|---|
| Token expires mid-backup | Single refresh attempt; if refresh fails, abort entire job |
| User navigates away | Backend continues; on return, `GET /backup-status` reconnects progress |
| Concurrent backup requests | In-memory `Set<userId>` guard, return 409 |
| Empty diagrams | Back up as empty `.excalidraw` files |
| Diagram with multiple scenes | Each scene = separate `.excalidraw` file |
| Drive file was deleted externally | Upload fails with existing ID → retry as new file |
| Server crash mid-backup | No recovery; user retries manually (upsert makes it safe) |
| 1000+ diagrams fail | `errors[]` capped at 50 items; summary shows full count |

---

## Implementation Order

0. Update `sync-to-drive.ts` for workspace-aware Drive paths (pre-requisite)
1. Backend use case (`backup-all-to-drive.ts`)
2. Socket `join-user-room` handler
3. `main.ts` wiring
4. Drive route endpoints (`POST backup-all` + `GET backup-status`)
5. Frontend API methods (`drive.ts`)
6. `BackupAllButton` component
7. `DriveIntegrationCard` integration

---

## Verification

- [ ] Enable Drive integration in Settings
- [ ] Create 3+ diagrams in different folders within a workspace
- [ ] Click "Backup All" → confirm → verify progress bar updates in real-time
- [ ] Check Google Drive: `Drawhaus Backups/{Workspace}/` has correct folder structure
- [ ] Run backup again → verify upsert (files updated, not duplicated)
- [ ] Test with Drive disconnected → should show error
- [ ] Test concurrent request → should return 409
- [ ] Navigate away mid-backup, return → verify progress reconnects
- [ ] Test as workspace viewer → should be denied (403)
- [ ] Test single-sync still works with new workspace-aware paths
- [ ] Typecheck: `cd frontend && npx tsc --noEmit` + `cd backend && npx tsc --noEmit`

---

## Expert Panel Adjustments (incorporated above)

1. **Rafa**: Align single-sync folder structure with workspace path before implementing backup-all → added as step 0 and file #8
2. **Nadia**: Auth check `role !== 'viewer'` on endpoint → added to route spec
3. **Nadia**: Max 1 token refresh per job, abort on failure → updated token refresh section
4. **Leo**: `GET /backup-status` for reconnection on page revisit → added endpoint and frontend behavior
5. **Leo**: Error messages must be user-facing → noted in BackupAllButton spec
6. **Rafa**: In-memory guard is single-server only → documented limitation
7. **Panel**: Cap `errors[]` at 50 items → added to types and edge cases
