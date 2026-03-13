import { Router } from "express";
import { z } from "zod";
import type { CreateFolderUseCase } from "../../../application/use-cases/folders/create-folder";
import type { ListFoldersUseCase } from "../../../application/use-cases/folders/list-folders";
import type { RenameFolderUseCase } from "../../../application/use-cases/folders/rename-folder";
import type { DeleteFolderUseCase } from "../../../application/use-cases/folders/delete-folder";
import { asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  workspaceId: z.string().uuid().nullable().optional(),
});

const renameSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export function createFolderRoutes(
  useCases: {
    create: CreateFolderUseCase;
    list: ListFoldersUseCase;
    rename: RenameFolderUseCase;
    delete: DeleteFolderUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", asyncRoute(async (req, res) => {
    const workspaceId = typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
    const folders = await useCases.list.execute(req.authUser.id, workspaceId);
    return res.json({ folders });
  }));

  router.post("/", validate(createSchema), asyncRoute(async (req, res) => {
    const folder = await useCases.create.execute(req.authUser.id, req.body.name, req.body.workspaceId);
    return res.status(201).json({ folder });
  }));

  router.patch("/:id", validate(renameSchema), asyncRoute(async (req, res) => {
    const folder = await useCases.rename.execute(String(req.params.id), req.authUser.id, req.body.name);
    return res.json({ folder });
  }));

  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.id), req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
