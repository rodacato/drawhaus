import { Router } from "express";
import { z } from "zod";
import type { CreateTemplateUseCase } from "../../../application/use-cases/templates/create-template";
import type { GetTemplateUseCase } from "../../../application/use-cases/templates/get-template";
import type { ListTemplatesUseCase } from "../../../application/use-cases/templates/list-templates";
import type { UpdateTemplateUseCase } from "../../../application/use-cases/templates/update-template";
import type { DeleteTemplateUseCase } from "../../../application/use-cases/templates/delete-template";
import type { UseTemplateUseCase } from "../../../application/use-cases/templates/use-template";
import type { TransferTemplateOwnershipUseCase } from "../../../application/use-cases/templates/transfer-ownership";
import { asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import type { Template } from "../../../domain/entities/template";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  elements: z.array(z.unknown()),
  appState: z.record(z.string(), z.unknown()),
  thumbnail: z.string().nullable().optional(),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(500).optional(),
    category: z.string().trim().min(1).max(50).optional(),
    thumbnail: z.string().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

const useSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
});

function formatTemplate(t: Template) {
  return {
    id: t.id,
    creatorId: t.creatorId,
    workspaceId: t.workspaceId,
    title: t.title,
    description: t.description,
    category: t.category,
    elements: t.elements,
    appState: t.appState,
    thumbnail: t.thumbnail,
    isBuiltIn: t.isBuiltIn,
    usageCount: t.usageCount,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function createTemplateRoutes(
  useCases: {
    create: CreateTemplateUseCase;
    get: GetTemplateUseCase;
    list: ListTemplatesUseCase;
    update: UpdateTemplateUseCase;
    delete: DeleteTemplateUseCase;
    use: UseTemplateUseCase;
    transferOwnership: TransferTemplateOwnershipUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();
  router.use(requireAuth);

  // List templates: built-in + personal + workspace (if workspaceId provided)
  router.get("/", asyncRoute(async (req, res) => {
    const workspaceId = typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
    const [mine, workspace] = await Promise.all([
      useCases.list.executeMine(req.authUser.id),
      workspaceId ? useCases.list.executeByWorkspace(workspaceId) : Promise.resolve([]),
    ]);
    // Deduplicate (user might be creator of workspace templates)
    const seen = new Set<string>();
    const merged: Template[] = [];
    for (const t of [...mine, ...workspace]) {
      if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
    }
    return res.json({ templates: merged.map(formatTemplate) });
  }));

  // Get single template
  router.get("/:id", asyncRoute(async (req, res) => {
    const template = await useCases.get.execute(String(req.params.id));
    return res.json({ template: formatTemplate(template) });
  }));

  // Create custom template
  router.post("/", validate(createSchema), asyncRoute(async (req, res) => {
    const template = await useCases.create.execute({
      creatorId: req.authUser.id,
      workspaceId: req.body.workspaceId,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      elements: req.body.elements,
      appState: req.body.appState,
      thumbnail: req.body.thumbnail,
    });
    return res.status(201).json({ template: formatTemplate(template) });
  }));

  // Use template to create a new diagram
  router.post("/:id/use", validate(useSchema), asyncRoute(async (req, res) => {
    const diagram = await useCases.use.execute({
      templateId: String(req.params.id),
      userId: req.authUser.id,
      title: req.body.title,
      workspaceId: req.body.workspaceId,
      folderId: req.body.folderId,
    });
    return res.status(201).json({ diagram: { id: diagram.id, title: diagram.title } });
  }));

  // Update custom template
  router.patch("/:id", validate(updateSchema), asyncRoute(async (req, res) => {
    const template = await useCases.update.execute(String(req.params.id), req.authUser.id, req.body);
    return res.json({ template: formatTemplate(template) });
  }));

  // Delete custom template
  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.id), req.authUser.id);
    return res.json({ success: true });
  }));

  // Transfer ownership (bulk)
  const transferSchema = z.object({
    templateIds: z.array(z.string().uuid()).min(1),
    newCreatorId: z.string().uuid(),
  });

  router.post("/transfer-ownership", validate(transferSchema), asyncRoute(async (req, res) => {
    await useCases.transferOwnership.execute(req.body.templateIds, req.authUser.id, req.body.newCreatorId);
    return res.json({ success: true });
  }));

  return router;
}
