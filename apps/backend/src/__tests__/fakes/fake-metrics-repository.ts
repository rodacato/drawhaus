import type { MetricsRepository } from "../../domain/ports/metrics-repository";

export class FakeMetricsRepository implements MetricsRepository {
  users = 0;
  diagrams = 0;
  activeSessions = 0;
  diagramsByOrigin: Record<string, number> = {};
  apiRequests = 0;

  async countUsers(): Promise<number> {
    return this.users;
  }

  async countDiagrams(): Promise<number> {
    return this.diagrams;
  }

  async countActiveSessions(): Promise<number> {
    return this.activeSessions;
  }

  async countDiagramsByOrigin(): Promise<Record<string, number>> {
    return this.diagramsByOrigin;
  }

  async countApiRequestsSince(): Promise<number> {
    return this.apiRequests;
  }
}
