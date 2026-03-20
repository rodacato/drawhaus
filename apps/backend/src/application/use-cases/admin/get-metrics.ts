import { pool } from "../../../infrastructure/db";

export class GetMetricsUseCase {
  async execute() {
    const [usersResult, diagramsResult, sessionsResult, createdViaResult, apiRequests24hResult] = await Promise.all([
      pool.query<{ count: string }>("SELECT count(*) FROM users"),
      pool.query<{ count: string }>("SELECT count(*) FROM diagrams"),
      pool.query<{ count: string }>("SELECT count(*) FROM sessions WHERE expires_at > now()"),
      pool.query<{ created_via: string; count: string }>(
        "SELECT COALESCE(created_via, 'ui') AS created_via, count(*) FROM diagrams GROUP BY COALESCE(created_via, 'ui')",
      ),
      pool.query<{ count: string }>(
        "SELECT count(*) FROM api_request_logs WHERE created_at > now() - interval '24 hours'",
      ),
    ]);

    const diagramsByOrigin: Record<string, number> = {};
    for (const row of createdViaResult.rows) {
      diagramsByOrigin[row.created_via] = parseInt(row.count, 10);
    }

    return {
      totalUsers: parseInt(usersResult.rows[0].count, 10),
      totalDiagrams: parseInt(diagramsResult.rows[0].count, 10),
      activeSessions: parseInt(sessionsResult.rows[0].count, 10),
      diagramsByOrigin,
      apiRequests24h: parseInt(apiRequests24hResult.rows[0].count, 10),
    };
  }
}
