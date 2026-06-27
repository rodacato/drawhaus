export interface MetricsRepository {
  countUsers(): Promise<number>;
  countDiagrams(): Promise<number>;
  countActiveSessions(): Promise<number>;
  countDiagramsByOrigin(): Promise<Record<string, number>>;
  countApiRequestsSince(since: Date): Promise<number>;
}
