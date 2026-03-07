import type { RequestHandler, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { pool } from "./db";
import { requireAuth, type AuthedRequest } from "./middleware";

type DiagramRow = {
  id: string;
  owner_id: string;
  title: string;
  elements: unknown[];
  app_state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type AccessRow = {
  id: string;
  owner_id: string;
  role: "editor" | "viewer" | null;
};

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

function asyncRoute(
  handler: (req: AuthedRequest, res: Response) => Promise<Response | void>
): RequestHandler {
  return (req, res) => {
    handler(req as AuthedRequest, res).catch((error: unknown) => {
      console.error("Diagram route failed", error);
      res.status(500).json({ error: "Internal server error" });
    });
  };
}

async function getAccess(diagramId: string, userId: string): Promise<AccessRow | null> {
  const { rows } = await pool.query<AccessRow>(
    `
      SELECT d.id, d.owner_id, dm.role
      FROM diagrams d
      LEFT JOIN diagram_members dm
        ON dm.diagram_id = d.id
       AND dm.user_id = $2
      WHERE d.id = $1
        AND (d.owner_id = $2 OR dm.user_id IS NOT NULL)
      LIMIT 1
    `,
    [diagramId, userId]
  );

  return rows[0] ?? null;
}

export const diagramsRouter = Router();
diagramsRouter.use(requireAuth);

diagramsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const userId = req.authUser.id;
    const { rows } = await pool.query<DiagramRow>(
      `
        SELECT DISTINCT d.id, d.owner_id, d.title, d.elements, d.app_state, d.created_at, d.updated_at
        FROM diagrams d
        LEFT JOIN diagram_members dm ON dm.diagram_id = d.id
        WHERE d.owner_id = $1 OR dm.user_id = $1
        ORDER BY d.updated_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      diagrams: rows.map((diagram) => ({
        id: diagram.id,
        ownerId: diagram.owner_id,
        title: diagram.title,
        elements: diagram.elements,
        appState: diagram.app_state,
        createdAt: diagram.created_at,
        updatedAt: diagram.updated_at,
      })),
    });
  })
);

diagramsRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const title = parsed.data.title ?? "Untitled";
    const { rows } = await pool.query<DiagramRow>(
      `
        INSERT INTO diagrams (owner_id, title)
        VALUES ($1, $2)
        RETURNING id, owner_id, title, elements, app_state, created_at, updated_at
      `,
      [req.authUser.id, title]
    );

    const diagram = rows[0];
    return res.status(201).json({
      diagram: {
        id: diagram.id,
        ownerId: diagram.owner_id,
        title: diagram.title,
        elements: diagram.elements,
        appState: diagram.app_state,
        createdAt: diagram.created_at,
        updatedAt: diagram.updated_at,
      },
    });
  })
);

diagramsRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    const diagramId = String(req.params.id);
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const access = await getAccess(diagramId, req.authUser.id);
    if (!access) {
      return res.status(404).json({ error: "Diagram not found" });
    }
    if (access.owner_id !== req.authUser.id && access.role !== "editor") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (parsed.data.title !== undefined) {
      updates.push(`title = $${index}`);
      values.push(parsed.data.title);
      index += 1;
    }
    if (parsed.data.elements !== undefined) {
      updates.push(`elements = $${index}`);
      values.push(JSON.stringify(parsed.data.elements));
      index += 1;
    }
    if (parsed.data.appState !== undefined) {
      updates.push(`app_state = $${index}`);
      values.push(JSON.stringify(parsed.data.appState));
      index += 1;
    }

    updates.push("updated_at = now()");
    values.push(diagramId);

    const { rows } = await pool.query<DiagramRow>(
      `
        UPDATE diagrams
        SET ${updates.join(", ")}
        WHERE id = $${index}
        RETURNING id, owner_id, title, elements, app_state, created_at, updated_at
      `,
      values
    );

    const diagram = rows[0];
    if (!diagram) {
      return res.status(404).json({ error: "Diagram not found" });
    }
    return res.status(200).json({
      diagram: {
        id: diagram.id,
        ownerId: diagram.owner_id,
        title: diagram.title,
        elements: diagram.elements,
        appState: diagram.app_state,
        createdAt: diagram.created_at,
        updatedAt: diagram.updated_at,
      },
    });
  })
);

diagramsRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    const diagramId = String(req.params.id);
    const { rows } = await pool.query<{ owner_id: string }>(
      "SELECT owner_id FROM diagrams WHERE id = $1 LIMIT 1",
      [diagramId]
    );
    const diagram = rows[0];

    if (!diagram) {
      return res.status(404).json({ error: "Diagram not found" });
    }
    if (diagram.owner_id !== req.authUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("DELETE FROM diagrams WHERE id = $1", [diagramId]);
    return res.status(200).json({ success: true });
  })
);
