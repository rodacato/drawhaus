import { Router } from "express";
import { z } from "zod";
import type { ListScenesUseCase } from "../../../application/use-cases/scenes/list-scenes";
import type { GetSceneUseCase } from "../../../application/use-cases/scenes/get-scene";
import type { CreateSceneUseCase } from "../../../application/use-cases/scenes/create-scene";
import type { RenameSceneUseCase } from "../../../application/use-cases/scenes/rename-scene";
import type { DeleteSceneUseCase } from "../../../application/use-cases/scenes/delete-scene";
import { asyncRoute } from "../middleware/async-handler";
import type { Scene } from "../../../domain/entities/scene";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

function formatScene(s: Scene) {
  return {
    id: s.id,
    diagramId: s.diagramId,
    name: s.name,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function formatSceneFull(s: Scene) {
  return {
    ...formatScene(s),
    elements: s.elements,
    appState: s.appState,
  };
}

export function createSceneRoutes(
  useCases: {
    list: ListScenesUseCase;
    get: GetSceneUseCase;
    create: CreateSceneUseCase;
    rename: RenameSceneUseCase;
    delete: DeleteSceneUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);

  // GET /api/diagrams/:diagramId/scenes
  router.get("/", asyncRoute(async (req, res) => {
    const scenes = await useCases.list.execute(String(req.params.diagramId), req.authUser.id);
    return res.json({ scenes: scenes.map(formatScene) });
  }));

  // GET /api/diagrams/:diagramId/scenes/:sceneId
  router.get("/:sceneId", asyncRoute(async (req, res) => {
    const scene = await useCases.get.execute(String(req.params.sceneId), req.authUser.id);
    return res.json({ scene: formatSceneFull(scene) });
  }));

  // POST /api/diagrams/:diagramId/scenes
  router.post("/", asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const scene = await useCases.create.execute(
      String(req.params.diagramId),
      req.authUser.id,
      parsed.data.name,
    );
    return res.status(201).json({ scene: formatScene(scene) });
  }));

  // PATCH /api/diagrams/:diagramId/scenes/:sceneId
  router.patch("/:sceneId", asyncRoute(async (req, res) => {
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const scene = await useCases.rename.execute(
      String(req.params.sceneId),
      req.authUser.id,
      parsed.data.name,
    );
    return res.json({ scene: formatScene(scene) });
  }));

  // DELETE /api/diagrams/:diagramId/scenes/:sceneId
  router.delete("/:sceneId", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.sceneId), req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
