import type { MetricsRepository } from "../../../domain/ports/metrics-repository";

const DAY_MS = 24 * 60 * 60 * 1000;

export class GetMetricsUseCase {
  constructor(private readonly metrics: MetricsRepository) {}

  async execute() {
    const since24h = new Date(Date.now() - DAY_MS);
    const [totalUsers, totalDiagrams, activeSessions, diagramsByOrigin, apiRequests24h] = await Promise.all([
      this.metrics.countUsers(),
      this.metrics.countDiagrams(),
      this.metrics.countActiveSessions(),
      this.metrics.countDiagramsByOrigin(),
      this.metrics.countApiRequestsSince(since24h),
    ]);

    return { totalUsers, totalDiagrams, activeSessions, diagramsByOrigin, apiRequests24h };
  }
}
