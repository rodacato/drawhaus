import { Router } from "express";
import { z } from "zod";
import type { CreateDiagramUseCase } from "../../../application/use-cases/diagrams/create-diagram";
import type { GetDiagramUseCase } from "../../../application/use-cases/diagrams/get-diagram";
import type { ListDiagramsUseCase } from "../../../application/use-cases/diagrams/list-diagrams";
import type { UpdateDiagramUseCase } from "../../../application/use-cases/diagrams/update-diagram";
import type { DeleteDiagramUseCase } from "../../../application/use-cases/diagrams/delete-diagram";
import type { Diagram } from "../../../domain/entities/diagram";
import { asyncRoute } from "../middleware/async-handler";
import { validate, validateParams, validateQuery } from "../middleware/validate";
import { sanitizeElements } from "./sanitize-elements";
import type { ApiKeyAuthedRequest } from "./middleware/require-api-key";
import { ForbiddenError } from "../../../domain/errors";
import { validateElements } from "@drawhaus/helpers";

const uuidParams = z.object({ id: z.string().uuid() });

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

const listQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

function formatDiagram(d: Diagram, frontendUrl: string, includeScene = false) {
  const base: Record<string, unknown> = {
    id: d.id,
    title: d.title,
    url: `${frontendUrl}/board/${d.id}`,
    createdVia: d.createdVia,
    folderId: d.folderId,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
  if (includeScene) {
    base.elements = d.elements;
    base.appState = d.appState;
  }
  return base;
}

function ensureWorkspaceScope(diagram: Diagram, apiKeyWorkspaceId: string): void {
  if (diagram.workspaceId !== apiKeyWorkspaceId) {
    throw new ForbiddenError();
  }
}

export function createV1DiagramRoutes(
  useCases: {
    create: CreateDiagramUseCase;
    get: GetDiagramUseCase;
    list: ListDiagramsUseCase;
    update: UpdateDiagramUseCase;
    delete: DeleteDiagramUseCase;
  },
  frontendUrl: string,
) {
  const router = Router();

  // POST /v1/diagrams — Create diagram in API key's workspace
  router.post("/", validate(createSchema), asyncRoute(async (req, res) => {
    const { authUser, apiKeyWorkspaceId } = req as ApiKeyAuthedRequest;
    const elements = req.body.elements ? sanitizeElements(req.body.elements) : undefined;

    if (elements) {
      const validation = validateElements(elements);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid elements", details: validation.errors });
      }
    }

    const diagram = await useCases.create.execute({
      ownerId: authUser.id,
      title: req.body.title,
      workspaceId: apiKeyWorkspaceId,
      folderId: req.body.folderId,
      elements,
      appState: req.body.appState,
      createdVia: String(req.headers["x-drawhaus-client"] ?? "").toLowerCase().includes("mcp") ? "mcp" : "api",
    });

    return res.status(201).json({ data: formatDiagram(diagram, frontendUrl, true) });
  }));

  // GET /v1/diagrams — List diagrams in API key's workspace
  router.get("/", validateQuery(listQuerySchema), asyncRoute(async (req, res) => {
    const { authUser, apiKeyWorkspaceId } = req as ApiKeyAuthedRequest;
    const { folderId, limit, offset } = req.query as unknown as z.infer<typeof listQuerySchema>;

    const folderFilter = folderId ?? undefined;
    const diagrams = await useCases.list.execute(authUser.id, folderFilter, apiKeyWorkspaceId);

    const paged = diagrams.slice(offset, offset + limit);
    return res.json({
      data: paged.map((d) => formatDiagram(d, frontendUrl)),
      total: diagrams.length,
      limit,
      offset,
    });
  }));

  // GET /v1/diagrams/:id — Get single diagram (must belong to workspace)
  router.get("/:id", validateParams(uuidParams), asyncRoute(async (req, res) => {
    const { authUser, apiKeyWorkspaceId } = req as ApiKeyAuthedRequest;

    const diagram = await useCases.get.execute(String(req.params.id), authUser.id);
    ensureWorkspaceScope(diagram, apiKeyWorkspaceId);

    return res.json({ data: formatDiagram(diagram, frontendUrl, true) });
  }));

  // PATCH /v1/diagrams/:id — Update diagram
  router.patch("/:id", validateParams(uuidParams), validate(patchSchema), asyncRoute(async (req, res) => {
    const { authUser, apiKeyWorkspaceId } = req as ApiKeyAuthedRequest;

    // Verify workspace scope before updating
    const existing = await useCases.get.execute(String(req.params.id), authUser.id);
    ensureWorkspaceScope(existing, apiKeyWorkspaceId);

    const updateData: { title?: string; elements?: unknown[]; appState?: Record<string, unknown> } = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.elements !== undefined) updateData.elements = sanitizeElements(req.body.elements);
    if (req.body.appState !== undefined) updateData.appState = req.body.appState;

    if (updateData.elements) {
      const validation = validateElements(updateData.elements);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid elements", details: validation.errors });
      }
    }

    const diagram = await useCases.update.execute(String(req.params.id), authUser.id, updateData);
    return res.json({ data: formatDiagram(diagram, frontendUrl, true) });
  }));

  // DELETE /v1/diagrams/:id — Delete diagram
  router.delete("/:id", validateParams(uuidParams), asyncRoute(async (req, res) => {
    const { authUser, apiKeyWorkspaceId } = req as ApiKeyAuthedRequest;

    // Verify workspace scope before deleting
    const existing = await useCases.get.execute(String(req.params.id), authUser.id);
    ensureWorkspaceScope(existing, apiKeyWorkspaceId);

    await useCases.delete.execute(String(req.params.id), authUser.id);
    return res.status(204).send();
  }));

  return router;
}
