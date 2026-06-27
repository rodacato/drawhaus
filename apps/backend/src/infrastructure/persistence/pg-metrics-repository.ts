import type { MetricsRepository } from "../../domain/ports/metrics-repository";
import { pool } from "../db";

export class PgMetricsRepository implements MetricsRepository {
  async countUsers(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>("SELECT count(*) FROM users");
    return Number.parseInt(rows[0].count, 10);
  }

  async countDiagrams(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>("SELECT count(*) FROM diagrams");
    return Number.parseInt(rows[0].count, 10);
  }

  async countActiveSessions(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      "SELECT count(*) FROM sessions WHERE expires_at > now()",
    );
    return Number.parseInt(rows[0].count, 10);
  }

  async countDiagramsByOrigin(): Promise<Record<string, number>> {
    const { rows } = await pool.query<{ created_via: string; count: string }>(
      "SELECT COALESCE(created_via, 'ui') AS created_via, count(*) FROM diagrams GROUP BY COALESCE(created_via, 'ui')",
    );
    const byOrigin: Record<string, number> = {};
    for (const row of rows) {
      byOrigin[row.created_via] = Number.parseInt(row.count, 10);
    }
    return byOrigin;
  }

  async countApiRequestsSince(since: Date): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      "SELECT count(*) FROM api_request_logs WHERE created_at > $1",
      [since.toISOString()],
    );
    return Number.parseInt(rows[0].count, 10);
  }
}
