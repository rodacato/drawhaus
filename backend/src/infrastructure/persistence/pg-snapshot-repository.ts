import type { SnapshotRepository } from "../../domain/ports/snapshot-repository";
import type { DiagramSnapshot, SnapshotTrigger } from "../../domain/entities/diagram-snapshot";
import { pool } from "../db";

type SnapshotRow = {
  id: string;
  diagram_id: string;
  created_by: string | null;
  trigger: string;
  name: string | null;
  elements: unknown[];
  app_state: Record<string, unknown>;
  created_at: string;
};

const COLS = "id, diagram_id, created_by, trigger, name, elements, app_state, created_at";
const META_COLS = "id, diagram_id, created_by, trigger, name, created_at";

function toDomain(row: SnapshotRow): DiagramSnapshot {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    createdBy: row.created_by,
    trigger: row.trigger as SnapshotTrigger,
    name: row.name,
    elements: row.elements,
    appState: row.app_state,
    createdAt: new Date(row.created_at),
  };
}

function toMeta(row: Omit<SnapshotRow, "elements" | "app_state">): DiagramSnapshot {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    createdBy: row.created_by,
    trigger: row.trigger as SnapshotTrigger,
    name: row.name,
    elements: [],
    appState: {},
    createdAt: new Date(row.created_at),
  };
}

export class PgSnapshotRepository implements SnapshotRepository {
  async create(data: {
    diagramId: string;
    createdBy: string | null;
    trigger: SnapshotTrigger;
    name?: string | null;
    elements: unknown[];
    appState: Record<string, unknown>;
  }): Promise<DiagramSnapshot> {
    const { rows } = await pool.query<SnapshotRow>(
      `INSERT INTO diagram_snapshots (diagram_id, created_by, trigger, name, elements, app_state)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLS}`,
      [
        data.diagramId,
        data.createdBy,
        data.trigger,
        data.name ?? null,
        JSON.stringify(data.elements),
        JSON.stringify(data.appState),
      ],
    );
    return toDomain(rows[0]);
  }

  async findById(id: string): Promise<DiagramSnapshot | null> {
    const { rows } = await pool.query<SnapshotRow>(
      `SELECT ${COLS} FROM diagram_snapshots WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async listByDiagram(diagramId: string): Promise<DiagramSnapshot[]> {
    const { rows } = await pool.query<Omit<SnapshotRow, "elements" | "app_state">>(
      `SELECT ${META_COLS} FROM diagram_snapshots WHERE diagram_id = $1 ORDER BY created_at DESC`,
      [diagramId],
    );
    return rows.map(toMeta);
  }

  async rename(id: string, name: string | null): Promise<DiagramSnapshot | null> {
    const { rows } = await pool.query<SnapshotRow>(
      `UPDATE diagram_snapshots SET name = $1 WHERE id = $2 RETURNING ${COLS}`,
      [name, id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM diagram_snapshots WHERE id = $1", [id]);
  }

  async findLatest(diagramId: string, trigger: SnapshotTrigger): Promise<DiagramSnapshot | null> {
    const { rows } = await pool.query<Omit<SnapshotRow, "elements" | "app_state">>(
      `SELECT ${META_COLS} FROM diagram_snapshots
       WHERE diagram_id = $1 AND trigger = $2
       ORDER BY created_at DESC LIMIT 1`,
      [diagramId, trigger],
    );
    return rows[0] ? toMeta(rows[0]) : null;
  }

  async countNamed(diagramId: string): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM diagram_snapshots WHERE diagram_id = $1 AND name IS NOT NULL",
      [diagramId],
    );
    return parseInt(rows[0].count, 10);
  }

  async purgeAuto(diagramId: string, keepCount: number, keepDays: number): Promise<number> {
    const { rowCount } = await pool.query(
      `DELETE FROM diagram_snapshots
       WHERE diagram_id = $1
         AND name IS NULL
         AND id NOT IN (
           SELECT id FROM diagram_snapshots
           WHERE diagram_id = $1 AND name IS NULL
           ORDER BY created_at DESC LIMIT $2
         )
         AND created_at < NOW() - INTERVAL '1 day' * $3`,
      [diagramId, keepCount, keepDays],
    );
    return rowCount ?? 0;
  }
}
