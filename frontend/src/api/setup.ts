import { api } from "./client";

export type SetupStatus = {
  step: number | "complete";
  setupCompleted: boolean;
  setupSkippedIntegrations?: boolean;
};

export const setupApi = {
  getStatus: () =>
    api.get("/api/setup/status").then((r) => r.data as SetupStatus),

  submitStep2: (data: { instanceName: string; registrationOpen: boolean }) =>
    api.post("/api/setup/step-2", data).then((r) => r.data),

  skipIntegrations: () =>
    api.post("/api/setup/skip-integrations").then((r) => r.data),

  complete: () =>
    api.post("/api/setup/complete").then((r) => r.data),
};
