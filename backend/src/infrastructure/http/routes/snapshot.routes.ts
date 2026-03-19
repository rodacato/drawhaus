import { Router } from "express";
import { z } from "zod";
import type { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import type { ListSnapshotsUseCase } from "../../../application/use-cases/snapshots/list-snapshots";
import type { GetSnapshotUseCase } from "../../../application/use-cases/snapshots/get-snapshot";
import type { RestoreSnapshotUseCase } from "../../../application/use-cases/snapshots/restore-snapshot";
import type { RenameSnapshotUseCase } from "../../../application/use-cases/snapshots/rename-snapshot";
import type { DeleteSnapshotUseCase } from "../../../application/use-cases/snapshots/delete-snapshot";
import { asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import type { DiagramSnapshot } from "../../../domain/entities/diagram-snapshot";

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
    const snapshot = await useCases.create.execute(
      String(req.params.diagramId),
      req.authUser.id,
      "manual",
      req.body.name,
    );
    if (!snapshot) {
      return res.status(429).json({ error: "Snapshot creation throttled" });
    }
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
