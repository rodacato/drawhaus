import { Router } from "express";
import { z } from "zod";
import type { CreateTagUseCase } from "../../../application/use-cases/tags/create-tag";
import type { ListTagsUseCase } from "../../../application/use-cases/tags/list-tags";
import type { DeleteTagUseCase } from "../../../application/use-cases/tags/delete-tag";
import type { UpdateTagUseCase } from "../../../application/use-cases/tags/update-tag";
import type { AssignTagUseCase } from "../../../application/use-cases/tags/assign-tag";
import type { UnassignTagUseCase } from "../../../application/use-cases/tags/unassign-tag";
import { asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";

const createSchema = z.object({
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().max(20).optional(),
});

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    color: z.string().trim().max(20).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const assignSchema = z.object({
  diagramId: z.string().uuid(),
});

export function createTagRoutes(
  useCases: {
    create: CreateTagUseCase;
    list: ListTagsUseCase;
    delete: DeleteTagUseCase;
    update: UpdateTagUseCase;
    assign: AssignTagUseCase;
    unassign: UnassignTagUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", asyncRoute(async (req, res) => {
    const tags = await useCases.list.execute(req.authUser.id);
    return res.json({ tags });
  }));

  router.post("/", validate(createSchema), asyncRoute(async (req, res) => {
    const tag = await useCases.create.execute(req.authUser.id, req.body.name, req.body.color);
    return res.status(201).json({ tag });
  }));

  router.patch("/:id", validate(updateSchema), asyncRoute(async (req, res) => {
    const tag = await useCases.update.execute(String(req.params.id), req.authUser.id, req.body);
    return res.json({ tag });
  }));

  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.id), req.authUser.id);
    return res.json({ success: true });
  }));

  router.post("/:id/assign", validate(assignSchema), asyncRoute(async (req, res) => {
    await useCases.assign.execute(String(req.params.id), req.body.diagramId, req.authUser.id);
    return res.json({ success: true });
  }));

  router.post("/:id/unassign", validate(assignSchema), asyncRoute(async (req, res) => {
    await useCases.unassign.execute(String(req.params.id), req.body.diagramId, req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
