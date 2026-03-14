# Backup All to Google Drive

> Bulk sync all diagrams in active workspace to Drive with folder structure and real-time progress.

## Why

Current Drive sync is per-diagram on save. Users want a one-click backup of their entire workspace for disaster recovery or migration. Self-hosted users especially value external backups.

## Architecture

- `POST /api/drive/backup-all` returns 202 with `{ jobId, totalDiagrams }`
- Progress via Socket.IO: `drive-backup-progress`, `drive-backup-complete`, `drive-backup-error`
- `GET /api/drive/backup-status` for reconnection on page revisit
- Concurrency limit of 3 (promise pool) — stays within Google Drive API rate limits (~10 req/sec)
- In-memory `Set<userId>` guard prevents concurrent backup jobs (409 if already running)
- Max 1 token refresh per job — abort on second 401 to prevent infinite loops
- Auth check: `role !== 'viewer'` — viewers shouldn't consume Drive quota

## Drive Folder Structure

```
Drawhaus Backups/
├── Personal/
│   ├── {Folder A}/
│   │   └── diagram-1.excalidraw
│   └── Unfiled/
│       └── diagram-2.excalidraw
└── {Workspace Name}/
    ├── {Folder B}/
    │   └── diagram-3.excalidraw
    └── Unfiled/
        └── diagram-5.excalidraw
```

## Pre-requisite

Update existing `sync-to-drive.ts` to use workspace-aware paths (`Drawhaus Backups/{WorkspaceName}/{FolderName}/`) so single-sync and backup-all are consistent.

## Frontend

`BackupAllButton` component in `DriveIntegrationCard` with states:
- idle → confirming (count + warning) → in-progress (progress bar) → complete (summary + expandable error list)

## Files

- **Create**: `backup-all-to-drive.ts` (use case), `BackupAllButton.tsx` (component)
- **Modify**: `drive.routes.ts` (endpoints), `socket/index.ts` (join-user-room), `main.ts` (wiring), `drive.ts` (API methods), `DriveIntegrationCard.tsx` (render button), `sync-to-drive.ts` (workspace paths)

## Performance

100 diagrams ≈ 115 API calls ≈ ~35 seconds at concurrency 3.

## Panel Notes

- Rafa: align single-sync folder structure first (pre-req); in-memory guard is single-server only — acceptable for self-hosted
- Nadia: auth check `role !== 'viewer'`; max 1 token refresh per job
- Leo: `GET /backup-status` for reconnection; error messages must be user-facing, not raw stack traces
- Cap `errors[]` at 50 items in response
