import type { DiagramRepository } from "../../domain/ports/diagram-repository";
import type { Diagram, DiagramRole } from "../../domain/entities/diagram";
import { pool } from "../db";

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
  owner_id: string;
  role: "editor" | "viewer" | null;
};

function toDomain(row: DiagramRow): Diagram {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    elements: row.elements,
    appState: row.app_state,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PgDiagramRepository implements DiagramRepository {
  async findById(id: string): Promise<Diagram | null> {
    const { rows } = await pool.query<DiagramRow>(
      "SELECT id, owner_id, title, elements, app_state, created_at, updated_at FROM diagrams WHERE id = $1 LIMIT 1",
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByUser(userId: string): Promise<Diagram[]> {
    const { rows } = await pool.query<DiagramRow>(
      `SELECT DISTINCT d.id, d.owner_id, d.title, d.elements, d.app_state, d.created_at, d.updated_at
       FROM diagrams d
       LEFT JOIN diagram_members dm ON dm.diagram_id = d.id
       WHERE d.owner_id = $1 OR dm.user_id = $1
       ORDER BY d.updated_at DESC`,
      [userId],
    );
    return rows.map(toDomain);
  }

  async findAccessRole(diagramId: string, userId: string): Promise<DiagramRole | null> {
    const { rows } = await pool.query<AccessRow>(
      `SELECT d.owner_id, dm.role
       FROM diagrams d
       LEFT JOIN diagram_members dm ON dm.diagram_id = d.id AND dm.user_id = $2
       WHERE d.id = $1 AND (d.owner_id = $2 OR dm.user_id IS NOT NULL)
       LIMIT 1`,
      [diagramId, userId],
    );
    if (!rows[0]) return null;
    return rows[0].owner_id === userId ? "owner" : (rows[0].role ?? "viewer");
  }

  async create(data: { title: string; ownerId: string }): Promise<Diagram> {
    const { rows } = await pool.query<DiagramRow>(
      `INSERT INTO diagrams (owner_id, title)
       VALUES ($1, $2)
       RETURNING id, owner_id, title, elements, app_state, created_at, updated_at`,
      [data.ownerId, data.title],
    );
    return toDomain(rows[0]);
  }

  async update(
    id: string,
    data: Partial<Pick<Diagram, "title" | "elements" | "appState">>,
  ): Promise<Diagram | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${index}`);
      values.push(data.title);
      index += 1;
    }
    if (data.elements !== undefined) {
      updates.push(`elements = $${index}`);
      values.push(JSON.stringify(data.elements));
      index += 1;
    }
    if (data.appState !== undefined) {
      updates.push(`app_state = $${index}`);
      values.push(JSON.stringify(data.appState));
      index += 1;
    }

    updates.push("updated_at = now()");
    values.push(id);

    const { rows } = await pool.query<DiagramRow>(
      `UPDATE diagrams SET ${updates.join(", ")} WHERE id = $${index}
       RETURNING id, owner_id, title, elements, app_state, created_at, updated_at`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async updateScene(
    id: string,
    elements: unknown[],
    appState: Record<string, unknown>,
  ): Promise<void> {
    await pool.query(
      "UPDATE diagrams SET elements = $1, app_state = $2, updated_at = now() WHERE id = $3",
      [JSON.stringify(elements), JSON.stringify(appState), id],
    );
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM diagrams WHERE id = $1", [id]);
  }
}
