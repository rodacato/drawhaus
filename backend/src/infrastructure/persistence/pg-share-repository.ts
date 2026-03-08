import crypto from "crypto";
import type { ShareRepository } from "../../domain/ports/share-repository";
import type { ShareLink } from "../../domain/entities/share-link";
import { pool } from "../db";

type ShareRow = {
  id: string;
  diagram_id: string;
  created_by: string;
  role: "editor" | "viewer";
  expires_at: string | null;
  created_at: string;
};

function toDomain(row: ShareRow): ShareLink {
  return {
    token: row.id,
    diagramId: row.diagram_id,
    createdBy: row.created_by,
    role: row.role,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
  };
}

export class PgShareRepository implements ShareRepository {
  async findByToken(token: string): Promise<ShareLink | null> {
    const { rows } = await pool.query<ShareRow>(
      "SELECT id, diagram_id, created_by, role, expires_at, created_at FROM share_links WHERE id = $1 LIMIT 1",
      [token],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByDiagram(diagramId: string): Promise<ShareLink[]> {
    const { rows } = await pool.query<ShareRow>(
      "SELECT id, diagram_id, created_by, role, expires_at, created_at FROM share_links WHERE diagram_id = $1 ORDER BY created_at DESC",
      [diagramId],
    );
    return rows.map(toDomain);
  }

  async create(data: {
    diagramId: string;
    createdBy: string;
    role: "editor" | "viewer";
    expiresAt: Date | null;
  }): Promise<ShareLink> {
    const token = crypto.randomBytes(24).toString("base64url");
    const { rows } = await pool.query<ShareRow>(
      `INSERT INTO share_links (id, diagram_id, created_by, role, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, diagram_id, created_by, role, expires_at, created_at`,
      [token, data.diagramId, data.createdBy, data.role, data.expiresAt?.toISOString() ?? null],
    );
    return toDomain(rows[0]);
  }

  async delete(token: string): Promise<void> {
    await pool.query("DELETE FROM share_links WHERE id = $1", [token]);
  }

  async findCreatedBy(token: string): Promise<string | null> {
    const { rows } = await pool.query<{ created_by: string }>(
      "SELECT created_by FROM share_links WHERE id = $1 LIMIT 1",
      [token],
    );
    return rows[0]?.created_by ?? null;
  }
}
