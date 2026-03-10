import type { TagRepository } from "../../domain/ports/tag-repository";
import type { Tag } from "../../domain/entities/tag";
import { NotFoundError } from "../../domain/errors";
import { pool } from "../db";

type TagRow = {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  created_at: string;
};

type DiagramTagRow = TagRow & { diagram_id: string };

function toDomain(row: TagRow): Tag {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    color: row.color,
    createdAt: new Date(row.created_at),
  };
}

export class PgTagRepository implements TagRepository {
  async create(ownerId: string, name: string, color: string): Promise<Tag> {
    const { rows } = await pool.query<TagRow>(
      `INSERT INTO tags (owner_id, name, color)
       VALUES ($1, $2, $3)
       RETURNING id, owner_id, name, color, created_at`,
      [ownerId, name, color],
    );
    return toDomain(rows[0]);
  }

  async list(ownerId: string): Promise<Tag[]> {
    const { rows } = await pool.query<TagRow>(
      "SELECT id, owner_id, name, color, created_at FROM tags WHERE owner_id = $1 ORDER BY name ASC",
      [ownerId],
    );
    return rows.map(toDomain);
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const { rowCount } = await pool.query(
      "DELETE FROM tags WHERE id = $1 AND owner_id = $2",
      [id, ownerId],
    );
    if (rowCount === 0) throw new NotFoundError("Tag");
  }

  async update(id: string, ownerId: string, data: { name?: string; color?: string }): Promise<Tag> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.color !== undefined) {
      sets.push(`color = $${idx++}`);
      values.push(data.color);
    }

    if (sets.length === 0) {
      // Nothing to update — just fetch and return
      const { rows } = await pool.query<TagRow>(
        "SELECT id, owner_id, name, color, created_at FROM tags WHERE id = $1 AND owner_id = $2 LIMIT 1",
        [id, ownerId],
      );
      if (!rows[0]) throw new NotFoundError("Tag");
      return toDomain(rows[0]);
    }

    values.push(id, ownerId);
    const { rows } = await pool.query<TagRow>(
      `UPDATE tags SET ${sets.join(", ")} WHERE id = $${idx++} AND owner_id = $${idx}
       RETURNING id, owner_id, name, color, created_at`,
      values,
    );
    if (!rows[0]) throw new NotFoundError("Tag");
    return toDomain(rows[0]);
  }

  async assignToDiagram(diagramId: string, tagId: string): Promise<void> {
    await pool.query(
      `INSERT INTO diagram_tags (diagram_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [diagramId, tagId],
    );
  }

  async unassignFromDiagram(diagramId: string, tagId: string): Promise<void> {
    await pool.query(
      "DELETE FROM diagram_tags WHERE diagram_id = $1 AND tag_id = $2",
      [diagramId, tagId],
    );
  }

  async listForDiagram(diagramId: string): Promise<Tag[]> {
    const { rows } = await pool.query<TagRow>(
      `SELECT t.id, t.owner_id, t.name, t.color, t.created_at
       FROM tags t
       JOIN diagram_tags dt ON dt.tag_id = t.id
       WHERE dt.diagram_id = $1
       ORDER BY t.name ASC`,
      [diagramId],
    );
    return rows.map(toDomain);
  }

  async listForDiagrams(diagramIds: string[]): Promise<Map<string, Tag[]>> {
    const result = new Map<string, Tag[]>();
    if (diagramIds.length === 0) return result;

    const { rows } = await pool.query<DiagramTagRow>(
      `SELECT dt.diagram_id, t.id, t.owner_id, t.name, t.color, t.created_at
       FROM tags t
       JOIN diagram_tags dt ON dt.tag_id = t.id
       WHERE dt.diagram_id = ANY($1)
       ORDER BY t.name ASC`,
      [diagramIds],
    );

    for (const row of rows) {
      const diagramId = row.diagram_id;
      if (!result.has(diagramId)) {
        result.set(diagramId, []);
      }
      result.get(diagramId)!.push(toDomain(row));
    }

    return result;
  }
}
