import type { TemplateRepository } from "../../domain/ports/template-repository";
import type { Template } from "../../domain/entities/template";
import { pool } from "../db";

type TemplateRow = {
  id: string;
  creator_id: string;
  workspace_id: string | null;
  title: string;
  description: string;
  category: string;
  elements: unknown[];
  app_state: Record<string, unknown>;
  thumbnail: string | null;
  is_built_in: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

const COLS = "id, creator_id, workspace_id, title, description, category, elements, app_state, thumbnail, is_built_in, usage_count, created_at, updated_at";

function toDomain(row: TemplateRow): Template {
  return {
    id: row.id,
    creatorId: row.creator_id,
    workspaceId: row.workspace_id,
    title: row.title,
    description: row.description,
    category: row.category,
    elements: row.elements,
    appState: row.app_state,
    thumbnail: row.thumbnail,
    isBuiltIn: row.is_built_in,
    usageCount: row.usage_count,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PgTemplateRepository implements TemplateRepository {
  async findById(id: string): Promise<Template | null> {
    const { rows } = await pool.query<TemplateRow>(
      `SELECT ${COLS} FROM templates WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByCreator(userId: string): Promise<Template[]> {
    const { rows } = await pool.query<TemplateRow>(
      `SELECT ${COLS} FROM templates WHERE creator_id = $1 AND is_built_in = false AND workspace_id IS NULL ORDER BY updated_at DESC`,
      [userId],
    );
    return rows.map(toDomain);
  }

  async findByWorkspace(workspaceId: string): Promise<Template[]> {
    const { rows } = await pool.query<TemplateRow>(
      `SELECT ${COLS} FROM templates WHERE workspace_id = $1 ORDER BY usage_count DESC, updated_at DESC`,
      [workspaceId],
    );
    return rows.map(toDomain);
  }

  async findAll(): Promise<Template[]> {
    const { rows } = await pool.query<TemplateRow>(
      `SELECT ${COLS} FROM templates ORDER BY is_built_in DESC, usage_count DESC, updated_at DESC`,
    );
    return rows.map(toDomain);
  }

  async create(data: {
    creatorId: string;
    workspaceId?: string | null;
    title: string;
    description: string;
    category: string;
    elements: unknown[];
    appState: Record<string, unknown>;
    thumbnail?: string | null;
  }): Promise<Template> {
    const { rows } = await pool.query<TemplateRow>(
      `INSERT INTO templates (creator_id, workspace_id, title, description, category, elements, app_state, thumbnail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${COLS}`,
      [
        data.creatorId,
        data.workspaceId ?? null,
        data.title,
        data.description,
        data.category,
        JSON.stringify(data.elements),
        JSON.stringify(data.appState),
        data.thumbnail ?? null,
      ],
    );
    return toDomain(rows[0]);
  }

  async update(id: string, data: Partial<Pick<Template, "title" | "description" | "category" | "thumbnail">>): Promise<Template | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.title !== undefined) { updates.push(`title = $${idx}`); values.push(data.title); idx += 1; }
    if (data.description !== undefined) { updates.push(`description = $${idx}`); values.push(data.description); idx += 1; }
    if (data.category !== undefined) { updates.push(`category = $${idx}`); values.push(data.category); idx += 1; }
    if (data.thumbnail !== undefined) { updates.push(`thumbnail = $${idx}`); values.push(data.thumbnail); idx += 1; }

    if (updates.length === 0) return this.findById(id);

    updates.push("updated_at = now()");
    values.push(id);

    const { rows } = await pool.query<TemplateRow>(
      `UPDATE templates SET ${updates.join(", ")} WHERE id = $${idx} RETURNING ${COLS}`,
      values,
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async incrementUsageCount(id: string): Promise<void> {
    await pool.query("UPDATE templates SET usage_count = usage_count + 1 WHERE id = $1", [id]);
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM templates WHERE id = $1", [id]);
  }
}
