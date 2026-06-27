import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GetMetricsUseCase } from "../../../application/use-cases/admin/get-metrics";
import { FakeMetricsRepository } from "../../fakes/fake-metrics-repository";

describe("GetMetricsUseCase", () => {
  it("aggregates counts from the metrics repository", async () => {
    const metrics = new FakeMetricsRepository();
    metrics.users = 5;
    metrics.diagrams = 12;
    metrics.activeSessions = 3;
    metrics.diagramsByOrigin = { ui: 10, api: 2 };
    metrics.apiRequests = 7;

    const result = await new GetMetricsUseCase(metrics).execute();

    assert.deepEqual(result, {
      totalUsers: 5,
      totalDiagrams: 12,
      activeSessions: 3,
      diagramsByOrigin: { ui: 10, api: 2 },
      apiRequests24h: 7,
    });
  });
});
