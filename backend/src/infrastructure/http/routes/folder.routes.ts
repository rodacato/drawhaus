import { Router } from "express";
import { z } from "zod";
import type { CreateFolderUseCase } from "../../../application/use-cases/folders/create-folder";
import type { ListFoldersUseCase } from "../../../application/use-cases/folders/list-folders";
import type { RenameFolderUseCase } from "../../../application/use-cases/folders/rename-folder";
import type { DeleteFolderUseCase } from "../../../application/use-cases/folders/delete-folder";
import { asyncRoute } from "../middleware/async-handler";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
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
    const folders = await useCases.list.execute(req.authUser.id);
    return res.json({ folders });
  }));

  router.post("/", asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const folder = await useCases.create.execute(req.authUser.id, parsed.data.name);
    return res.status(201).json({ folder });
  }));

  router.patch("/:id", asyncRoute(async (req, res) => {
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const folder = await useCases.rename.execute(String(req.params.id), req.authUser.id, parsed.data.name);
    return res.json({ folder });
  }));

  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.id), req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
