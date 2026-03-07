import type { Request, RequestHandler, Response } from "express";
import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { pool } from "./db";
import { requireAuth, type AuthedRequest } from "./middleware";

type ShareLinkRow = {
  id: string;
  diagram_id: string;
  role: "editor" | "viewer";
  expires_at: string | null;
  created_at: string;
};

type DiagramRow = {
  id: string;
  title: string;
  elements: unknown[];
  app_state: Record<string, unknown>;
};

const createSchema = z.object({
  role: z.enum(["editor", "viewer"]).optional().default("viewer"),
  expiresInHours: z.number().int().min(1).max(720).optional(),
});

function asyncRoute(
  handler: (req: AuthedRequest, res: Response) => Promise<Response | void>
): RequestHandler {
  return (req, res) => {
    handler(req as AuthedRequest, res).catch((error: unknown) => {
      console.error("Share route failed", error);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

function asyncPublicRoute(
  handler: (req: Request, res: Response) => Promise<Response | void>
): RequestHandler {
  return (req, res) => {
    handler(req, res).catch((error: unknown) => {
      console.error("Share public route failed", error);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

export const shareRouter = Router();

// Create share link (authenticated, owner/editor only)
shareRouter.post(
  "/:diagramId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const diagramId = String(req.params.diagramId);
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Check ownership or editor access
    const { rows: accessRows } = await pool.query<{ owner_id: string; role: string | null }>(
      `
        SELECT d.owner_id, dm.role
        FROM diagrams d
        LEFT JOIN diagram_members dm ON dm.diagram_id = d.id AND dm.user_id = $2
        WHERE d.id = $1
          AND (d.owner_id = $2 OR dm.user_id IS NOT NULL)
        LIMIT 1
      `,
      [diagramId, req.authUser.id]
    );

    const access = accessRows[0];
    if (!access) {
      return res.status(404).json({ error: "Diagram not found" });
    }
    if (access.owner_id !== req.authUser.id && access.role !== "editor") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = parsed.data.expiresInHours
      ? new Date(Date.now() + parsed.data.expiresInHours * 3600_000).toISOString()
      : null;

    const { rows } = await pool.query<ShareLinkRow>(
      `
        INSERT INTO share_links (id, diagram_id, created_by, role, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, diagram_id, role, expires_at, created_at
      `,
      [token, diagramId, req.authUser.id, parsed.data.role, expiresAt]
    );

    const link = rows[0];
    return res.status(201).json({
      shareLink: {
        token: link.id,
        diagramId: link.diagram_id,
        role: link.role,
        expiresAt: link.expires_at,
        createdAt: link.created_at,
      },
    });
  })
);

// List share links for a diagram (authenticated)
shareRouter.get(
  "/:diagramId/links",
  requireAuth,
  asyncRoute(async (req, res) => {
    const diagramId = String(req.params.diagramId);

    // Verify ownership
    const { rows: diagRows } = await pool.query<{ owner_id: string }>(
      "SELECT owner_id FROM diagrams WHERE id = $1 LIMIT 1",
      [diagramId]
    );
    if (!diagRows[0] || diagRows[0].owner_id !== req.authUser.id) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    const { rows } = await pool.query<ShareLinkRow>(
      "SELECT id, diagram_id, role, expires_at, created_at FROM share_links WHERE diagram_id = $1 ORDER BY created_at DESC",
      [diagramId]
    );

    return res.status(200).json({
      links: rows.map((l) => ({
        token: l.id,
        diagramId: l.diagram_id,
        role: l.role,
        expiresAt: l.expires_at,
        createdAt: l.created_at,
      })),
    });
  })
);

// Delete share link (authenticated, owner only)
shareRouter.delete(
  "/link/:token",
  requireAuth,
  asyncRoute(async (req, res) => {
    const token = String(req.params.token);

    const { rows } = await pool.query<{ created_by: string }>(
      "SELECT created_by FROM share_links WHERE id = $1 LIMIT 1",
      [token]
    );
    if (!rows[0] || rows[0].created_by !== req.authUser.id) {
      return res.status(404).json({ error: "Link not found" });
    }

    await pool.query("DELETE FROM share_links WHERE id = $1", [token]);
    return res.status(200).json({ success: true });
  })
);

// Resolve share link (public, no auth required)
shareRouter.get(
  "/link/:token",
  asyncPublicRoute(async (req, res) => {
    const token = String(req.params.token);

    const { rows: linkRows } = await pool.query<ShareLinkRow>(
      "SELECT id, diagram_id, role, expires_at, created_at FROM share_links WHERE id = $1 LIMIT 1",
      [token]
    );

    const link = linkRows[0];
    if (!link) {
      return res.status(404).json({ error: "Link not found or expired" });
    }

    if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: "Link has expired" });
    }

    const { rows: diagRows } = await pool.query<DiagramRow>(
      "SELECT id, title, elements, app_state FROM diagrams WHERE id = $1 LIMIT 1",
      [link.diagram_id]
    );

    const diagram = diagRows[0];
    if (!diagram) {
      return res.status(404).json({ error: "Diagram not found" });
    }

    return res.status(200).json({
      share: {
        token: link.id,
        role: link.role,
        expiresAt: link.expires_at,
      },
      diagram: {
        id: diagram.id,
        title: diagram.title,
        elements: diagram.elements,
        appState: diagram.app_state,
      },
    });
  })
);
