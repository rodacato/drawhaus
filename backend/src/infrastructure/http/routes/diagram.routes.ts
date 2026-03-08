import { Router } from "express";
import { z } from "zod";
import type { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import type { GetDiagramUseCase } from "../../../application/use-cases/diagrams/get-diagram";
import type { ListDiagramsUseCase } from "../../../application/use-cases/diagrams/list-diagrams";
import type { UpdateDiagramUseCase } from "../../../application/use-cases/diagrams/update-diagram";
import type { DeleteDiagramUseCase } from "../../../application/use-cases/diagrams/delete-diagram";
import { asyncRoute } from "../middleware/async-handler";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
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

function formatDiagram(d: { id: string; ownerId: string; title: string; elements: unknown[]; appState: Record<string, unknown>; createdAt: Date; updatedAt: Date }) {
  return {
    id: d.id,
    ownerId: d.ownerId,
    title: d.title,
    elements: d.elements,
    appState: d.appState,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export function createDiagramRoutes(
  useCases: {
    create: CreateDiagramUseCase;
    get: GetDiagramUseCase;
    list: ListDiagramsUseCase;
    update: UpdateDiagramUseCase;
    delete: DeleteDiagramUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", asyncRoute(async (req, res) => {
    const diagrams = await useCases.list.execute(req.authUser.id);
    return res.status(200).json({ diagrams: diagrams.map(formatDiagram) });
  }));

  router.get("/:id", asyncRoute(async (req, res) => {
    const diagram = await useCases.get.execute(String(req.params.id), req.authUser.id);
    return res.status(200).json({ diagram: formatDiagram(diagram) });
  }));

  router.post("/", asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const diagram = await useCases.create.execute({
      ownerId: req.authUser.id,
      title: parsed.data.title,
    });
    return res.status(201).json({ diagram: formatDiagram(diagram) });
  }));

  router.patch("/:id", asyncRoute(async (req, res) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const diagram = await useCases.update.execute(
      String(req.params.id),
      req.authUser.id,
      parsed.data,
    );
    return res.status(200).json({ diagram: formatDiagram(diagram) });
  }));

  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.id), req.authUser.id);
    return res.status(200).json({ success: true });
  }));

  return router;
}
