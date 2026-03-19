import { Router } from "express";
import { z } from "zod";
import type { CreateApiKeyUseCase } from "../../../application/use-cases/api-keys/create-api-key";
import type { ListApiKeysUseCase } from "../../../application/use-cases/api-keys/list-api-keys";
import type { RevokeApiKeyUseCase } from "../../../application/use-cases/api-keys/revoke-api-key";
import { asyncRoute } from "../middleware/async-handler";
import { validate } from "../middleware/validate";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  workspaceId: z.string().uuid(),
  expiresAt: z.string().datetime().optional(),
});

export function createApiKeyRoutes(
  useCases: {
    create: CreateApiKeyUseCase;
    list: ListApiKeysUseCase;
    revoke: RevokeApiKeyUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", asyncRoute(async (req, res) => {
    const keys = await useCases.list.execute(req.authUser.id);
    return res.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        workspaceId: k.workspaceId,
        keyPrefix: k.keyPrefix,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        revokedAt: k.revokedAt?.toISOString() ?? null,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    });
  }));

  router.post("/", validate(createSchema), asyncRoute(async (req, res) => {
    const { apiKey, plainKey } = await useCases.create.execute({
      userId: req.authUser.id,
      workspaceId: req.body.workspaceId,
      name: req.body.name,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
    });
    return res.status(201).json({
      key: {
        id: apiKey.id,
        name: apiKey.name,
        workspaceId: apiKey.workspaceId,
        keyPrefix: apiKey.keyPrefix,
        expiresAt: apiKey.expiresAt?.toISOString() ?? null,
        createdAt: apiKey.createdAt.toISOString(),
      },
      plainKey,
    });
  }));

  router.delete("/:id", asyncRoute(async (req, res) => {
    await useCases.revoke.execute(String(req.params.id), req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
