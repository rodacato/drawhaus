import { Router } from "express";
import { z } from "zod";
import type { Server } from "socket.io";
import type { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import type { ListSnapshotsUseCase } from "../../../application/use-cases/snapshots/list-snapshots";
import type { GetSnapshotUseCase } from "../../../application/use-cases/snapshots/get-snapshot";
import type { RestoreSnapshotUseCase } from "../../../application/use-cases/snapshots/restore-snapshot";
import type { RenameSnapshotUseCase } from "../../../application/use-cases/snapshots/rename-snapshot";
import type { DeleteSnapshotUseCase } from "../../../application/use-cases/snapshots/delete-snapshot";
import { asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import type { DiagramSnapshot } from "../../../domain/entities/diagram-snapshot";

export type IoHolder = { io: Server | null };

const createSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(100).nullable(),
});

function formatSnapshot(s: DiagramSnapshot) {
  return {
    id: s.id,
    diagramId: s.diagramId,
    createdBy: s.createdBy,
    createdByName: s.createdByName,
    activeUsers: s.activeUsers,
    trigger: s.trigger,
    name: s.name,
    createdAt: s.createdAt.toISOString(),
  };
}

function formatSnapshotFull(s: DiagramSnapshot) {
  return {
    ...formatSnapshot(s),
    elements: s.elements,
    appState: s.appState,
  };
}

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
  ioHolder?: IoHolder,
) {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);

  // GET /api/diagrams/:diagramId/snapshots
  router.get("/", asyncRoute(async (req, res) => {
    const snapshots = await useCases.list.execute(String(req.params.diagramId), req.authUser.id);
    return res.json({ snapshots: snapshots.map(formatSnapshot) });
  }));

  // POST /api/diagrams/:diagramId/snapshots
  router.post("/", validate(createSchema), asyncRoute(async (req, res) => {
    const diagramId = String(req.params.diagramId);
    const snapshot = await useCases.create.execute(
      diagramId,
      req.authUser.id,
      "manual",
      req.body.name,
    );
    if (!snapshot) {
      return res.status(429).json({ error: "Snapshot creation throttled" });
    }
    ioHolder?.io?.to(diagramId).emit("snapshot-created", { diagramId, snapshot: formatSnapshot(snapshot) });
    return res.status(201).json({ snapshot: formatSnapshot(snapshot) });
  }));

  // GET /api/diagrams/:diagramId/snapshots/:snapshotId
  router.get("/:snapshotId", asyncRoute(async (req, res) => {
    const snapshot = await useCases.get.execute(String(req.params.snapshotId), req.authUser.id);
    return res.json({ snapshot: formatSnapshotFull(snapshot) });
  }));

  // POST /api/diagrams/:diagramId/snapshots/:snapshotId/restore
  router.post("/:snapshotId/restore", asyncRoute(async (req, res) => {
    const result = await useCases.restore.execute(String(req.params.snapshotId), req.authUser.id);

    if (ioHolder?.io) {
      const { diagramId } = result;
      // Notify all users in the room about the restore
      ioHolder.io.to(diagramId).emit("snapshot-restored", {
        diagramId,
        restoredBy: { userId: req.authUser.id, userName: req.authUser.name },
        snapshotId: req.params.snapshotId,
      });
      // Broadcast restored scene to all users so their canvas updates
      if (result.sceneId) {
        ioHolder.io.to(diagramId).emit("scene-from-db", {
          elements: result.elements,
          appState: result.appState,
        });
      }
      // Trigger snapshot list refresh (pre-restore backup was created)
      ioHolder.io.to(diagramId).emit("snapshot-created", { diagramId });
    }

    return res.json({ success: true, diagramId: result.diagramId });
  }));

  // PATCH /api/diagrams/:diagramId/snapshots/:snapshotId
  router.patch("/:snapshotId", validate(renameSchema), asyncRoute(async (req, res) => {
    const snapshot = await useCases.rename.execute(
      String(req.params.snapshotId),
      req.authUser.id,
      req.body.name,
    );
    return res.json({ snapshot: formatSnapshot(snapshot) });
  }));

  // DELETE /api/diagrams/:diagramId/snapshots/:snapshotId
  router.delete("/:snapshotId", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.snapshotId), req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
