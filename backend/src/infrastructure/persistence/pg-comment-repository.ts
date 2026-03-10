import type { CommentRepository } from "../../domain/ports/comment-repository";
import type { CommentThread, CommentReply } from "../../domain/entities/comment";
import { pool } from "../db";

type ThreadRow = {
  id: string;
  diagram_id: string;
  element_id: string;
  author_id: string;
  author_name: string;
  body: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReplyRow = {
  id: string;
  thread_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
};

function threadToDomain(row: ThreadRow, replies: CommentReply[]): CommentThread {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    elementId: row.element_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    resolved: row.resolved,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    replies,
  };
}

function replyToDomain(row: ReplyRow): CommentReply {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: new Date(row.created_at),
  };
}

const THREAD_SELECT = `
  SELECT ct.id, ct.diagram_id, ct.element_id, ct.author_id, u.name AS author_name,
         ct.body, ct.resolved, ct.resolved_by, ct.resolved_at, ct.created_at, ct.updated_at
  FROM comment_threads ct
  JOIN users u ON u.id = ct.author_id`;

const REPLY_SELECT = `
  SELECT cr.id, cr.thread_id, cr.author_id, u.name AS author_name, cr.body, cr.created_at
  FROM comment_replies cr
  JOIN users u ON u.id = cr.author_id`;

export class PgCommentRepository implements CommentRepository {
  async findByDiagram(diagramId: string): Promise<CommentThread[]> {
    const { rows: threadRows } = await pool.query<ThreadRow>(
      `${THREAD_SELECT} WHERE ct.diagram_id = $1 ORDER BY ct.created_at`,
      [diagramId],
    );
    if (threadRows.length === 0) return [];

    const threadIds = threadRows.map((t) => t.id);
    const { rows: replyRows } = await pool.query<ReplyRow>(
      `${REPLY_SELECT} WHERE cr.thread_id = ANY($1) ORDER BY cr.created_at`,
      [threadIds],
    );

    const repliesByThread = new Map<string, CommentReply[]>();
    for (const row of replyRows) {
      const list = repliesByThread.get(row.thread_id) ?? [];
      list.push(replyToDomain(row));
      repliesByThread.set(row.thread_id, list);
    }

    return threadRows.map((row) => threadToDomain(row, repliesByThread.get(row.id) ?? []));
  }

  async findThreadById(id: string): Promise<CommentThread | null> {
    const { rows: threadRows } = await pool.query<ThreadRow>(
      `${THREAD_SELECT} WHERE ct.id = $1 LIMIT 1`,
      [id],
    );
    if (!threadRows[0]) return null;

    const { rows: replyRows } = await pool.query<ReplyRow>(
      `${REPLY_SELECT} WHERE cr.thread_id = $1 ORDER BY cr.created_at`,
      [id],
    );

    return threadToDomain(threadRows[0], replyRows.map(replyToDomain));
  }

  async createThread(data: { diagramId: string; elementId: string; authorId: string; body: string }): Promise<CommentThread> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO comment_threads (diagram_id, element_id, author_id, body)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [data.diagramId, data.elementId, data.authorId, data.body],
    );
    return (await this.findThreadById(rows[0].id))!;
  }

  async addReply(data: { threadId: string; authorId: string; body: string }): Promise<CommentReply> {
    const { rows } = await pool.query<ReplyRow>(
      `INSERT INTO comment_replies (thread_id, author_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, thread_id, author_id, body, created_at`,
      [data.threadId, data.authorId, data.body],
    );
    // Fetch with author name
    const { rows: full } = await pool.query<ReplyRow>(
      `${REPLY_SELECT} WHERE cr.id = $1`,
      [rows[0].id],
    );
    return replyToDomain(full[0]);
  }

  async resolveThread(id: string, userId: string): Promise<CommentThread | null> {
    const { rowCount } = await pool.query(
      `UPDATE comment_threads SET resolved = true, resolved_by = $1, resolved_at = now(), updated_at = now() WHERE id = $2`,
      [userId, id],
    );
    if (rowCount === 0) return null;
    return this.findThreadById(id);
  }

  async unresolveThread(id: string): Promise<CommentThread | null> {
    const { rowCount } = await pool.query(
      `UPDATE comment_threads SET resolved = false, resolved_by = NULL, resolved_at = NULL, updated_at = now() WHERE id = $1`,
      [id],
    );
    if (rowCount === 0) return null;
    return this.findThreadById(id);
  }

  async deleteThread(id: string): Promise<void> {
    await pool.query("DELETE FROM comment_threads WHERE id = $1", [id]);
  }

  async deleteReply(id: string): Promise<void> {
    await pool.query("DELETE FROM comment_replies WHERE id = $1", [id]);
  }
}
