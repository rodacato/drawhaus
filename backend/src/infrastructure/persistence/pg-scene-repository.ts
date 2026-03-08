import type { SceneRepository } from "../../domain/ports/scene-repository";
import type { Scene } from "../../domain/entities/scene";
import { pool } from "../db";

type SceneRow = {
  id: string;
  diagram_id: string;
  name: string;
  elements: unknown[];
  app_state: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const COLS = "id, diagram_id, name, elements, app_state, sort_order, created_at, updated_at";

function toDomain(row: SceneRow): Scene {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    name: row.name,
    elements: row.elements,
    appState: row.app_state,
    sortOrder: row.sort_order,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PgSceneRepository implements SceneRepository {
  async findById(id: string): Promise<Scene | null> {
    const { rows } = await pool.query<SceneRow>(
      `SELECT ${COLS} FROM scenes WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByDiagram(diagramId: string): Promise<Scene[]> {
    const { rows } = await pool.query<SceneRow>(
      `SELECT ${COLS} FROM scenes WHERE diagram_id = $1 ORDER BY sort_order, created_at`,
      [diagramId],
    );
    return rows.map(toDomain);
  }

  async create(data: {
    diagramId: string;
    name: string;
    sortOrder: number;
    elements?: unknown[];
    appState?: Record<string, unknown>;
  }): Promise<Scene> {
    const { rows } = await pool.query<SceneRow>(
      `INSERT INTO scenes (diagram_id, name, sort_order, elements, app_state)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${COLS}`,
      [data.diagramId, data.name, data.sortOrder, JSON.stringify(data.elements ?? []), JSON.stringify(data.appState ?? {})],
    );
    return toDomain(rows[0]);
  }

  async rename(id: string, name: string): Promise<Scene | null> {
    const { rows } = await pool.query<SceneRow>(
      `UPDATE scenes SET name = $1 WHERE id = $2 RETURNING ${COLS}`,
      [name, id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async updateScene(id: string, elements: unknown[], appState: Record<string, unknown>): Promise<void> {
    await pool.query(
      "UPDATE scenes SET elements = $1, app_state = $2, updated_at = now() WHERE id = $3",
      [JSON.stringify(elements), JSON.stringify(appState), id],
    );
  }

  async reorder(id: string, sortOrder: number): Promise<void> {
    await pool.query("UPDATE scenes SET sort_order = $1 WHERE id = $2", [sortOrder, id]);
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM scenes WHERE id = $1", [id]);
  }
}
