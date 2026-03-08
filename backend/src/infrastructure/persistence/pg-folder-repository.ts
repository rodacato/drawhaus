import type { FolderRepository } from "../../domain/ports/folder-repository";
import type { Folder } from "../../domain/entities/folder";
import { pool } from "../db";

type FolderRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

function toDomain(row: FolderRow): Folder {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    createdAt: new Date(row.created_at),
  };
}

export class PgFolderRepository implements FolderRepository {
  async findById(id: string): Promise<Folder | null> {
    const { rows } = await pool.query<FolderRow>(
      "SELECT id, owner_id, name, created_at FROM folders WHERE id = $1 LIMIT 1",
      [id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findByUser(userId: string): Promise<Folder[]> {
    const { rows } = await pool.query<FolderRow>(
      "SELECT id, owner_id, name, created_at FROM folders WHERE owner_id = $1 ORDER BY name ASC",
      [userId],
    );
    return rows.map(toDomain);
  }

  async create(data: { ownerId: string; name: string }): Promise<Folder> {
    const { rows } = await pool.query<FolderRow>(
      `INSERT INTO folders (owner_id, name)
       VALUES ($1, $2)
       RETURNING id, owner_id, name, created_at`,
      [data.ownerId, data.name],
    );
    return toDomain(rows[0]);
  }

  async rename(id: string, name: string): Promise<Folder | null> {
    const { rows } = await pool.query<FolderRow>(
      `UPDATE folders SET name = $1 WHERE id = $2
       RETURNING id, owner_id, name, created_at`,
      [name, id],
    );
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM folders WHERE id = $1", [id]);
  }
}
