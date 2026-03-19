import type { SnapshotRepository } from "../../domain/ports/snapshot-repository";
import type { DiagramSnapshot, SnapshotTrigger } from "../../domain/entities/diagram-snapshot";
import { pool } from "../db";

type SnapshotRow = {
  id: string;
  diagram_id: string;
  created_by: string | null;
  created_by_name: string | null;
  active_users: number;
  content_hash: string | null;
  trigger: string;
  name: string | null;
  elements: unknown[];
  app_state: Record<string, unknown>;
  created_at: string;
};

type MetaRow = Omit<SnapshotRow, "elements" | "app_state">;

function toDomain(row: SnapshotRow): DiagramSnapshot {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    activeUsers: row.active_users,
    contentHash: row.content_hash,
    trigger: row.trigger as SnapshotTrigger,
    name: row.name,
    elements: row.elements,
    appState: row.app_state,
    createdAt: new Date(row.created_at),
  };
}

function toMeta(row: MetaRow): DiagramSnapshot {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    activeUsers: row.active_users,
    contentHash: row.content_hash,
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
    activeUsers?: number;
    contentHash?: string | null;
    elements: unknown[];
    appState: Record<string, unknown>;
  }): Promise<DiagramSnapshot> {
    const { rows } = await pool.query<Omit<SnapshotRow, "created_by_name">>(
      `INSERT INTO diagram_snapshots (diagram_id, created_by, trigger, name, active_users, content_hash, elements, app_state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.diagramId,
        data.createdBy,
        data.trigger,
        data.name ?? null,
        data.activeUsers ?? 1,
        data.contentHash ?? null,
        JSON.stringify(data.elements),
        JSON.stringify(data.appState),
      ],
    );
    // Resolve user name
    let createdByName: string | null = null;
    if (data.createdBy) {
      const { rows: userRows } = await pool.query<{ name: string }>(
        "SELECT name FROM users WHERE id = $1", [data.createdBy],
      );
      createdByName = userRows[0]?.name ?? null;
    }
    return toDomain({ ...rows[0], created_by_name: createdByName });
  }

  async findById(id: string): Promise<DiagramSnapshot | null> {
    const { rows } = await pool.query<SnapshotRow>(
      `SELECT ds.id, ds.diagram_id, ds.created_by, u.name AS created_by_name,
              ds.active_users, ds.content_hash, ds.trigger, ds.name, ds.elements, ds.app_state, ds.created_at
       FROM diagram_snapshots ds
       LEFT JOIN users u ON u.id = ds.created_by
       WHERE ds.id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async listByDiagram(diagramId: string): Promise<DiagramSnapshot[]> {
    const { rows } = await pool.query<MetaRow>(
      `SELECT ds.id, ds.diagram_id, ds.created_by, u.name AS created_by_name,
              ds.active_users, ds.content_hash, ds.trigger, ds.name, ds.created_at
       FROM diagram_snapshots ds
       LEFT JOIN users u ON u.id = ds.created_by
       WHERE ds.diagram_id = $1
       ORDER BY ds.created_at DESC`,
      [diagramId],
    );
    return rows.map(toMeta);
  }

  async rename(id: string, name: string | null): Promise<DiagramSnapshot | null> {
    const { rows } = await pool.query<SnapshotRow>(
      `UPDATE diagram_snapshots SET name = $1 WHERE id = $2
       RETURNING id, diagram_id, created_by, active_users, content_hash, trigger, name, elements, app_state, created_at`,
      [name, id],
    );
    if (!rows[0]) return null;
    const { rows: userRows } = await pool.query<{ name: string }>(
      "SELECT name FROM users WHERE id = $1", [rows[0].created_by],
    );
    return toDomain({ ...rows[0], created_by_name: userRows[0]?.name ?? null });
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM diagram_snapshots WHERE id = $1", [id]);
  }

  async findLatestForDiagram(diagramId: string): Promise<DiagramSnapshot | null> {
    const { rows } = await pool.query<MetaRow>(
      `SELECT ds.id, ds.diagram_id, ds.created_by, u.name AS created_by_name,
              ds.active_users, ds.content_hash, ds.trigger, ds.name, ds.created_at
       FROM diagram_snapshots ds
       LEFT JOIN users u ON u.id = ds.created_by
       WHERE ds.diagram_id = $1
       ORDER BY ds.created_at DESC LIMIT 1`,
      [diagramId],
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
