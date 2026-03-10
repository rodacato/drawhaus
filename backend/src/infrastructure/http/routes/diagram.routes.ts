import { Router } from "express";
import { z } from "zod";
import type { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import type { GetDiagramUseCase } from "../../../application/use-cases/diagrams/get-diagram";
import type { ListDiagramsUseCase } from "../../../application/use-cases/diagrams/list-diagrams";
import type { SearchDiagramsUseCase } from "../../../application/use-cases/diagrams/search-diagrams";
import type { UpdateDiagramUseCase } from "../../../application/use-cases/diagrams/update-diagram";
import type { DeleteDiagramUseCase } from "../../../application/use-cases/diagrams/delete-diagram";
import type { UpdateThumbnailUseCase } from "../../../application/use-cases/diagrams/update-thumbnail";
import type { ToggleStarUseCase } from "../../../application/use-cases/diagrams/toggle-star";
import type { DuplicateDiagramUseCase } from "../../../application/use-cases/diagrams/duplicate-diagram";
import type { MoveDiagramUseCase } from "../../../application/use-cases/folders/move-diagram";
import { asyncRoute } from "../middleware/async-handler";
import type { Diagram } from "../../../domain/entities/diagram";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  folderId: z.string().uuid().nullable().optional(),
  elements: z.array(z.unknown()).optional(),
  appState: z.record(z.string(), z.unknown()).optional(),
});

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    elements: z.array(z.unknown()).optional(),
    appState: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const moveSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

function formatDiagram(d: Diagram) {
  return {
    id: d.id,
    ownerId: d.ownerId,
    folderId: d.folderId,
    title: d.title,
    elements: d.elements,
    appState: d.appState,
    thumbnail: d.thumbnail,
    starred: d.starred,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export function createDiagramRoutes(
  useCases: {
    create: CreateDiagramUseCase;
    get: GetDiagramUseCase;
    list: ListDiagramsUseCase;
    search: SearchDiagramsUseCase;
    update: UpdateDiagramUseCase;
    updateThumbnail: UpdateThumbnailUseCase;
    delete: DeleteDiagramUseCase;
    toggleStar: ToggleStarUseCase;
    duplicate: DuplicateDiagramUseCase;
    move: MoveDiagramUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();
  router.use(requireAuth);

  // Search must be registered before /:id to avoid "search" being parsed as UUID
  router.get("/search", asyncRoute(async (req, res) => {
    const q = String(req.query.q ?? "");
    const diagrams = await useCases.search.execute(req.authUser.id, q);
    return res.json({ diagrams: diagrams.map(formatDiagram) });
  }));

  router.get("/", asyncRoute(async (req, res) => {
    const folderParam = req.query.folderId;
    const folderId = folderParam === "null" ? null : (typeof folderParam === "string" ? folderParam : undefined);
    const diagrams = await useCases.list.execute(req.authUser.id, folderId);
    return res.json({ diagrams: diagrams.map(formatDiagram) });
  }));

  router.get("/:id", asyncRoute(async (req, res) => {
    const diagram = await useCases.get.execute(String(req.params.id), req.authUser.id);
    return res.json({ diagram: formatDiagram(diagram) });
  }));

  router.post("/", asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const diagram = await useCases.create.execute({
      ownerId: req.authUser.id,
      title: parsed.data.title,
      folderId: parsed.data.folderId,
      elements: parsed.data.elements,
      appState: parsed.data.appState,
    });
    return res.status(201).json({ diagram: formatDiagram(diagram) });
  }));

  router.put("/:id/thumbnail", asyncRoute(async (req, res) => {
    const thumbnail = req.body?.thumbnail;
    if (typeof thumbnail !== "string") return res.status(400).json({ error: "thumbnail is required" });
    await useCases.updateThumbnail.execute(String(req.params.id), req.authUser.id, thumbnail);
    return res.json({ success: true });
  }));

  router.post("/:id/move", asyncRoute(async (req, res) => {
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    await useCases.move.execute(String(req.params.id), req.authUser.id, parsed.data.folderId);
    return res.json({ success: true });
  }));

  router.patch("/:id/star", asyncRoute(async (req, res) => {
    const starred = req.body?.starred;
    if (typeof starred !== "boolean") return res.status(400).json({ error: "starred is required" });
    await useCases.toggleStar.execute(String(req.params.id), req.authUser.id, starred);
    return res.json({ success: true });
  }));

  router.post("/:id/duplicate", asyncRoute(async (req, res) => {
    const diagram = await useCases.duplicate.execute(String(req.params.id), req.authUser.id);
    return res.status(201).json({ diagram: formatDiagram(diagram) });
  }));

  router.patch("/:id", asyncRoute(async (req, res) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const diagram = await useCases.update.execute(String(req.params.id), req.authUser.id, parsed.data);
    return res.json({ diagram: formatDiagram(diagram) });
  }));

  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.id), req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
