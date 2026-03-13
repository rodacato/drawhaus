import { Router } from "express";
import { z } from "zod";
import type { GetDriveStatusUseCase } from "../../../application/use-cases/drive/get-drive-status";
import type { ToggleDriveBackupUseCase } from "../../../application/use-cases/drive/toggle-drive-backup";
import type { DisconnectDriveUseCase } from "../../../application/use-cases/drive/disconnect-drive";
import type { ExportToDriveUseCase } from "../../../application/use-cases/drive/export-to-drive";
import type { ListDriveFilesUseCase } from "../../../application/use-cases/drive/list-drive-files";
import type { ImportFromDriveUseCase } from "../../../application/use-cases/drive/import-from-drive";
import type { GoogleTokenRefresher } from "../../services/google-token-refresh";
import { asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";

const toggleSchema = z.object({
  enabled: z.boolean(),
});

const importSchema = z.object({
  fileId: z.string().min(1),
  fileName: z.string().min(1),
});

const exportSchema = z.object({
  format: z.enum(["excalidraw", "png", "svg"]),
  targetFolderId: z.string().min(1),
  content: z.string().min(1),
  fileName: z.string().min(1),
});

export function createDriveRoutes(
  useCases: {
    getDriveStatus: GetDriveStatusUseCase;
    toggleDriveBackup: ToggleDriveBackupUseCase;
    disconnectDrive: DisconnectDriveUseCase;
    exportToDrive: ExportToDriveUseCase;
    listDriveFiles: ListDriveFilesUseCase;
    importFromDrive: ImportFromDriveUseCase;
  },
  tokenRefresher: GoogleTokenRefresher,
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();

  router.get("/status", requireAuth, asyncRoute(async (req, res) => {
    const status = await useCases.getDriveStatus.execute(req.authUser.id);
    return res.json(status);
  }));

  router.post("/backup/toggle", requireAuth, validate(toggleSchema), asyncRoute(async (req, res) => {
    const result = await useCases.toggleDriveBackup.execute(req.authUser.id, req.body.enabled);
    return res.json(result);
  }));

  router.post("/disconnect", requireAuth, asyncRoute(async (req, res) => {
    await useCases.disconnectDrive.execute(req.authUser.id);
    return res.json({ success: true });
  }));

  router.post("/export", requireAuth, validate(exportSchema), asyncRoute(async (req, res) => {
    const result = await useCases.exportToDrive.execute(req.authUser.id, req.body);
    return res.json(result);
  }));

  router.get("/picker-token", requireAuth, asyncRoute(async (req, res) => {
    const accessToken = await tokenRefresher.getValidAccessToken(req.authUser.id);
    return res.json({ accessToken });
  }));

  router.get("/files", requireAuth, asyncRoute(async (req, res) => {
    const folderId = typeof req.query.folderId === "string" ? req.query.folderId : undefined;
    const result = await useCases.listDriveFiles.execute(req.authUser.id, folderId);
    return res.json(result);
  }));

  router.post("/import", requireAuth, validate(importSchema), asyncRoute(async (req, res) => {
    const result = await useCases.importFromDrive.execute(req.authUser.id, req.body);
    return res.json(result);
  }));

  return router;
}
