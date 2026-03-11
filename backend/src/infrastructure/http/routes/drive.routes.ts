import { Router } from "express";
import { z } from "zod";
import type { GetDriveStatusUseCase } from "../../../application/use-cases/drive/get-drive-status";
import type { ToggleDriveBackupUseCase } from "../../../application/use-cases/drive/toggle-drive-backup";
import type { DisconnectDriveUseCase } from "../../../application/use-cases/drive/disconnect-drive";
import type { ExportToDriveUseCase } from "../../../application/use-cases/drive/export-to-drive";
import type { GoogleTokenRefresher } from "../../services/google-token-refresh";
import { asyncRoute } from "../middleware/async-handler";

const toggleSchema = z.object({
  enabled: z.boolean(),
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
  },
  tokenRefresher: GoogleTokenRefresher,
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();

  router.get("/status", requireAuth, asyncRoute(async (req, res) => {
    const status = await useCases.getDriveStatus.execute(req.authUser.id);
    return res.json(status);
  }));

  router.post("/backup/toggle", requireAuth, asyncRoute(async (req, res) => {
    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const result = await useCases.toggleDriveBackup.execute(req.authUser.id, parsed.data.enabled);
    return res.json(result);
  }));

  router.post("/disconnect", requireAuth, asyncRoute(async (req, res) => {
    await useCases.disconnectDrive.execute(req.authUser.id);
    return res.json({ success: true });
  }));

  router.post("/export", requireAuth, asyncRoute(async (req, res) => {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const result = await useCases.exportToDrive.execute(req.authUser.id, parsed.data);
    return res.json(result);
  }));

  router.get("/picker-token", requireAuth, asyncRoute(async (req, res) => {
    const accessToken = await tokenRefresher.getValidAccessToken(req.authUser.id);
    return res.json({ accessToken });
  }));

  return router;
}
