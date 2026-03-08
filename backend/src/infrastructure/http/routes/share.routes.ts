import { Router } from "express";
import { z } from "zod";
import type { CreateShareLinkUseCase } from "../../../application/use-cases/share/create-link";
import type { ResolveLinkUseCase } from "../../../application/use-cases/share/resolve-link";
import type { ListLinksUseCase } from "../../../application/use-cases/share/list-links";
import type { DeleteLinkUseCase } from "../../../application/use-cases/share/delete-link";
import { asyncRoute, asyncPublicRoute } from "../middleware/async-handler";

const createSchema = z.object({
  role: z.enum(["editor", "viewer"]).optional().default("viewer"),
  expiresInHours: z.number().int().min(1).max(720).optional(),
});

function formatLink(l: { token: string; diagramId: string; role: string; expiresAt: Date | null; createdAt: Date }) {
  return {
    token: l.token,
    diagramId: l.diagramId,
    role: l.role,
    expiresAt: l.expiresAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

export function createShareRoutes(
  useCases: {
    createLink: CreateShareLinkUseCase;
    resolveLink: ResolveLinkUseCase;
    listLinks: ListLinksUseCase;
    deleteLink: DeleteLinkUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router();

  router.post("/:diagramId", requireAuth, asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

    const link = await useCases.createLink.execute({
      diagramId: String(req.params.diagramId),
      userId: req.authUser.id,
      role: parsed.data.role,
      expiresInHours: parsed.data.expiresInHours,
    });
    return res.status(201).json({ shareLink: formatLink(link) });
  }));

  router.get("/:diagramId/links", requireAuth, asyncRoute(async (req, res) => {
    const links = await useCases.listLinks.execute(
      String(req.params.diagramId),
      req.authUser.id,
    );
    return res.status(200).json({ links: links.map(formatLink) });
  }));

  router.delete("/link/:token", requireAuth, asyncRoute(async (req, res) => {
    await useCases.deleteLink.execute(String(req.params.token), req.authUser.id);
    return res.status(200).json({ success: true });
  }));

  router.get("/link/:token", asyncPublicRoute(async (req, res) => {
    const { link, diagram } = await useCases.resolveLink.execute(String(req.params.token));
    return res.status(200).json({
      share: {
        token: link.token,
        role: link.role,
        expiresAt: link.expiresAt?.toISOString() ?? null,
      },
      diagram: {
        id: diagram.id,
        title: diagram.title,
        elements: diagram.elements,
        appState: diagram.appState,
      },
    });
  }));

  return router;
}
