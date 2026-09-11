import crypto from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import type { WorkspaceRole } from "../../domain/entities/workspace";
import { pool } from "../../infrastructure/db";
import { PgUserRepository } from "../../infrastructure/persistence/pg-user-repository";
import { PgWorkspaceRepository } from "../../infrastructure/persistence/pg-workspace-repository";

const users = new PgUserRepository();
const workspaces = new PgWorkspaceRepository();

export async function createUser(name = "User"): Promise<string> {
  const user = await users.create({
    email: `${crypto.randomUUID()}@test.local`,
    name,
    passwordHash: null,
  });
  return user.id;
}

/** The owner becomes an admin member, as in the product. */
export async function createWorkspace(ownerId: string, name = "Workspace"): Promise<string> {
  const workspace = await workspaces.create({ name, ownerId });
  return workspace.id;
}

export function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<void> {
  return workspaces.addMember(workspaceId, userId, role);
}

// No repository writes diagram_members; the rows only exist through direct SQL.
export async function addDiagramMember(
  diagramId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<void> {
  await pool.query("INSERT INTO diagram_members (diagram_id, user_id, role) VALUES ($1, $2, $3)", [
    diagramId,
    userId,
    role,
  ]);
}

export async function countRows(table: string, where = "true", params: unknown[] = []) {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM ${table} WHERE ${where}`,
    params,
  );
  return rows[0].count;
}

/** Resolves once a query in the test database is blocked waiting on a lock. */
export async function waitForLockWaiter(): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const { rows } = await pool.query<{ waiting: number }>(
      `SELECT count(*)::int AS waiting FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'`,
    );
    if (rows[0].waiting > 0) return;
    await sleep(10);
  }
  throw new Error("No query started waiting on a lock");
}
