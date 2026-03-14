import type { DiagramRepository } from "../../domain/ports/diagram-repository";
import type { Diagram, DiagramRole } from "../../domain/entities/diagram";
import { pool } from "../db";

type DiagramRow = {
  id: string;
  owner_id: string;
  workspace_id: string | null;
  folder_id: string | null;
  title: string;
  elements: unknown[];
  app_state: Record<string, unknown>;
  thumbnail: string | null;
  starred: boolean;
  created_at: string;
  updated_at: string;
};

type AccessRow = {
  owner_id: string;
  dm_role: "editor" | "viewer" | null;
  wm_role: "admin" | "editor" | "viewer" | null;
};

const COLS = "id, owner_id, workspace_id, folder_id, title, elements, app_state, thumbnail, starred, created_at, updated_at";

function toDomain(row: DiagramRow): Diagram {
  return {
    id: row.id,
    ownerId: row.owner_id,
    workspaceId: row.workspace_id,
    folderId: row.folder_id,
    title: row.title,
    elements: row.elements,
    appState: row.app_state,
    thumbnail: row.thumbnail,
    starred: row.starred,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, "\\$&");
}

/** d.col alias helper */
const D_COLS = COLS.split(", ").map((c) => `d.${c}`).join(", ");

export class PgDiagramRepository implements DiagramRepository {
  async findById(id: string): Promise<Diagram | null> {
    const { rows } = await pool.query<DiagramRow>(
      `SELECT ${COLS} FROM diagrams WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByUser(userId: string, folderId?: string | null, workspaceId?: string): Promise<Diagram[]> {
    // Workspace-scoped query
    if (workspaceId) {
      const conditions = [`d.workspace_id = $1`, `(d.owner_id = $2 OR dm.user_id = $2 OR wm.user_id IS NOT NULL)`];
      const params: unknown[] = [workspaceId, userId];

      if (folderId !== undefined) {
        if (folderId === null) {
          conditions.push(`d.folder_id IS NULL`);
        } else {
          params.push(folderId);
          conditions.push(`d.folder_id = $${params.length}`);
        }
      }

      const { rows } = await pool.query<DiagramRow>(
        `SELECT DISTINCT ${D_COLS}
         FROM diagrams d
         LEFT JOIN diagram_members dm ON dm.diagram_id = d.id AND dm.user_id = $2
         LEFT JOIN workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.user_id = $2
         WHERE ${conditions.join(" AND ")}
         ORDER BY d.updated_at DESC`,
        params,
      );
      return rows.map(toDomain);
    }

    // Legacy: user-scoped query (personal diagrams or all)
    if (folderId !== undefined) {
      const sql = folderId === null
        ? `SELECT DISTINCT ON (d.id) ${D_COLS}
           FROM diagrams d
           LEFT JOIN diagram_members dm ON dm.diagram_id = d.id
           LEFT JOIN workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.user_id = $1
           WHERE (d.owner_id = $1 OR dm.user_id = $1 OR wm.user_id IS NOT NULL) AND d.folder_id IS NULL
           ORDER BY d.id, d.updated_at DESC`
        : `SELECT DISTINCT ON (d.id) ${D_COLS}
           FROM diagrams d
           LEFT JOIN diagram_members dm ON dm.diagram_id = d.id
           LEFT JOIN workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.user_id = $1
           WHERE (d.owner_id = $1 OR dm.user_id = $1 OR wm.user_id IS NOT NULL) AND d.folder_id = $2
           ORDER BY d.id, d.updated_at DESC`;
      const params = folderId === null ? [userId] : [userId, folderId];
      const { rows } = await pool.query<DiagramRow>(sql, params);
      return rows.map(toDomain);
    }

    const { rows } = await pool.query<DiagramRow>(
      `SELECT DISTINCT ${D_COLS}
       FROM diagrams d
       LEFT JOIN diagram_members dm ON dm.diagram_id = d.id AND dm.user_id = $1
       LEFT JOIN workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.user_id = $1
       WHERE d.owner_id = $1 OR dm.user_id IS NOT NULL OR wm.user_id IS NOT NULL
       ORDER BY d.updated_at DESC`,
      [userId],
    );
    return rows.map(toDomain);
  }

  async findAccessRole(diagramId: string, userId: string): Promise<DiagramRole | null> {
    const { rows } = await pool.query<AccessRow>(
      `SELECT d.owner_id, dm.role AS dm_role, wm.role AS wm_role
       FROM diagrams d
       LEFT JOIN diagram_members dm ON dm.diagram_id = d.id AND dm.user_id = $2
       LEFT JOIN workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.user_id = $2
       WHERE d.id = $1 AND (d.owner_id = $2 OR dm.user_id IS NOT NULL OR wm.user_id IS NOT NULL)
       LIMIT 1`,
      [diagramId, userId],
    );
    if (!rows[0]) return null;
    if (rows[0].owner_id === userId) return "owner";
    // Highest privilege wins: diagram_members overrides workspace_members
    if (rows[0].dm_role) return rows[0].dm_role;
    // workspace admin → editor on diagrams (admin is a workspace-level concept)
    if (rows[0].wm_role === "admin" || rows[0].wm_role === "editor") return "editor";
    return "viewer";
  }

  async create(data: { title: string; ownerId: string; workspaceId?: string | null; folderId?: string | null; elements?: unknown[]; appState?: Record<string, unknown>; thumbnail?: string | null }): Promise<Diagram> {
    const folderId = data.folderId ?? null;
    const workspaceId = data.workspaceId ?? null;
    const hasScene = data.elements !== undefined;

    const sql = hasScene
      ? `INSERT INTO diagrams (owner_id, workspace_id, folder_id, title, elements, app_state, thumbnail)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLS}`
      : `INSERT INTO diagrams (owner_id, workspace_id, folder_id, title, thumbnail)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`;
    const params = hasScene
      ? [data.ownerId, workspaceId, folderId, data.title, JSON.stringify(data.elements), JSON.stringify(data.appState ?? {}), data.thumbnail ?? null]
      : [data.ownerId, workspaceId, folderId, data.title, data.thumbnail ?? null];

    const { rows } = await pool.query<DiagramRow>(sql, params);
    return toDomain(rows[0]);
  }

  async update(id: string, data: Partial<Pick<Diagram, "title" | "elements" | "appState">>): Promise<Diagram | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.title !== undefined) { updates.push(`title = $${index}`); values.push(data.title); index += 1; }
    if (data.elements !== undefined) { updates.push(`elements = $${index}`); values.push(JSON.stringify(data.elements)); index += 1; }
    if (data.appState !== undefined) { updates.push(`app_state = $${index}`); values.push(JSON.stringify(data.appState)); index += 1; }

    updates.push("updated_at = now()");
    values.push(id);

    const { rows } = await pool.query<DiagramRow>(
      `UPDATE diagrams SET ${updates.join(", ")} WHERE id = $${index} RETURNING ${COLS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async updateScene(id: string, elements: unknown[], appState: Record<string, unknown>): Promise<void> {
    await pool.query(
      "UPDATE diagrams SET elements = $1, app_state = $2, updated_at = now() WHERE id = $3",
      [JSON.stringify(elements), JSON.stringify(appState), id],
    );
  }

  async moveTo(id: string, folderId: string | null): Promise<void> {
    await pool.query("UPDATE diagrams SET folder_id = $1 WHERE id = $2", [folderId, id]);
  }

  async moveToWorkspace(id: string, workspaceId: string | null): Promise<void> {
    await pool.query("UPDATE diagrams SET workspace_id = $1, folder_id = NULL WHERE id = $2", [workspaceId, id]);
  }

  async search(userId: string, query: string): Promise<Diagram[]> {
    const { rows } = await pool.query<DiagramRow>(
      `SELECT DISTINCT ${D_COLS}
       FROM diagrams d
       LEFT JOIN diagram_members dm ON dm.diagram_id = d.id AND dm.user_id = $1
       LEFT JOIN workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.user_id = $1
       WHERE (d.owner_id = $1 OR dm.user_id IS NOT NULL OR wm.user_id IS NOT NULL) AND d.title ILIKE $2
       ORDER BY d.updated_at DESC LIMIT 50`,
      [userId, `%${escapeLike(query)}%`],
    );
    return rows.map(toDomain);
  }

  async updateThumbnail(id: string, thumbnail: string): Promise<void> {
    await pool.query("UPDATE diagrams SET thumbnail = $1 WHERE id = $2", [thumbnail, id]);
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM diagrams WHERE id = $1", [id]);
  }

  async toggleStar(id: string, starred: boolean): Promise<void> {
    await pool.query("UPDATE diagrams SET starred = $1 WHERE id = $2", [starred, id]);
  }

  async transferBulkOwnership(diagramIds: string[], newOwnerId: string): Promise<void> {
    if (diagramIds.length === 0) return;
    await pool.query(
      `UPDATE diagrams SET owner_id = $1, updated_at = now() WHERE id = ANY($2)`,
      [newOwnerId, diagramIds],
    );
  }

  async findByOwnerInWorkspace(ownerId: string, workspaceId: string): Promise<Diagram[]> {
    const { rows } = await pool.query<DiagramRow>(
      `SELECT ${COLS} FROM diagrams WHERE owner_id = $1 AND workspace_id = $2 ORDER BY updated_at DESC`,
      [ownerId, workspaceId],
    );
    return rows.map(toDomain);
  }
}
