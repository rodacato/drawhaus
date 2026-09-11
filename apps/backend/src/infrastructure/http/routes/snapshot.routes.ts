import { Router } from "express";
import { z } from "zod";
import type { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import type { ListSnapshotsUseCase } from "../../../application/use-cases/snapshots/list-snapshots";
import type { GetSnapshotUseCase } from "../../../application/use-cases/snapshots/get-snapshot";
import type { RestoreSnapshotUseCase } from "../../../application/use-cases/snapshots/restore-snapshot";
import type { RenameSnapshotUseCase } from "../../../application/use-cases/snapshots/rename-snapshot";
import type { DeleteSnapshotUseCase } from "../../../application/use-cases/snapshots/delete-snapshot";
import { asyncRoute } from "../middleware/async-handler";
import { validate, validateParams } from "../middleware/validate";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";
import { formatSnapshot, formatSnapshotFull } from "../../serializers/snapshot";

const diagramIdParams = z.object({ diagramId: z.uuid() });
const snapshotParams = z.object({ diagramId: z.uuid(), snapshotId: z.uuid() });

const createSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(100).nullable(),
});

export function createSnapshotRoutes(
  useCases: {
    create: CreateSnapshotUseCase;
    list: ListSnapshotsUseCase;
    get: GetSnapshotUseCase;
    restore: RestoreSnapshotUseCase;
    rename: RenameSnapshotUseCase;
    delete: DeleteSnapshotUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
  notifier?: RealtimeNotifier,
) {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);

  // GET /api/diagrams/:diagramId/snapshots
  router.get(
    "/",
    validateParams(diagramIdParams),
    asyncRoute(async (req, res) => {
      const snapshots = await useCases.list.execute(String(req.params.diagramId), req.authUser.id);
      return res.json({ snapshots: snapshots.map(formatSnapshot) });
    }),
  );

  // POST /api/diagrams/:diagramId/snapshots
  router.post(
    "/",
    validateParams(diagramIdParams),
    validate(createSchema),
    asyncRoute(async (req, res) => {
      const diagramId = String(req.params.diagramId);
      const snapshot = await useCases.create.createManual(
        diagramId,
        req.authUser.id,
        req.body.name,
      );
      notifier?.snapshotCreated({ diagramId, snapshot });
      return res.status(201).json({ snapshot: formatSnapshot(snapshot) });
    }),
  );

  // GET /api/diagrams/:diagramId/snapshots/:snapshotId
  router.get(
    "/:snapshotId",
    validateParams(snapshotParams),
    asyncRoute(async (req, res) => {
      const snapshot = await useCases.get.execute(String(req.params.snapshotId), req.authUser.id);
      return res.json({ snapshot: formatSnapshotFull(snapshot) });
    }),
  );

  // POST /api/diagrams/:diagramId/snapshots/:snapshotId/restore
  router.post(
    "/:snapshotId/restore",
    validateParams(snapshotParams),
    asyncRoute(async (req, res) => {
      const result = await useCases.restore.execute(String(req.params.snapshotId), req.authUser.id);

      notifier?.snapshotRestored({
        diagramId: result.diagramId,
        snapshotId: String(req.params.snapshotId),
        restoredBy: { userId: req.authUser.id, userName: req.authUser.name },
        scene: result.sceneId
          ? {
              sceneId: result.sceneId,
              revision: result.revision,
              elements: result.elements,
              appState: result.appState,
            }
          : null,
      });

      return res.json({ success: true, diagramId: result.diagramId });
    }),
  );

  // PATCH /api/diagrams/:diagramId/snapshots/:snapshotId
  router.patch(
    "/:snapshotId",
    validateParams(snapshotParams),
    validate(renameSchema),
    asyncRoute(async (req, res) => {
      const snapshot = await useCases.rename.execute(
        String(req.params.snapshotId),
        req.authUser.id,
        req.body.name,
      );
      return res.json({ snapshot: formatSnapshot(snapshot) });
    }),
  );

  // DELETE /api/diagrams/:diagramId/snapshots/:snapshotId
  router.delete(
    "/:snapshotId",
    validateParams(snapshotParams),
    asyncRoute(async (req, res) => {
      await useCases.delete.execute(String(req.params.snapshotId), req.authUser.id);
      return res.json({ success: true });
    }),
  );

  return router;
}
