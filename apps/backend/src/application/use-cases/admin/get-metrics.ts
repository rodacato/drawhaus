import { pool } from "../../../infrastructure/db";

export class GetMetricsUseCase {
  async execute() {
    const [usersResult, diagramsResult, sessionsResult] = await Promise.all([
      pool.query<{ count: string }>("SELECT count(*) FROM users"),
      pool.query<{ count: string }>("SELECT count(*) FROM diagrams"),
      pool.query<{ count: string }>("SELECT count(*) FROM sessions WHERE expires_at > now()"),
    ]);

    return {
      totalUsers: parseInt(usersResult.rows[0].count, 10),
      totalDiagrams: parseInt(diagramsResult.rows[0].count, 10),
      activeSessions: parseInt(sessionsResult.rows[0].count, 10),
    };
  }
}
