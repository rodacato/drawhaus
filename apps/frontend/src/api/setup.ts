import { api } from "./client";

export type SetupStatus = {
  step: number | "complete";
  setupCompleted: boolean;
  setupSkippedIntegrations?: boolean;
};

export const setupApi = {
  getStatus: () =>
    api.get("/api/setup/status") as Promise<SetupStatus>,

  submitStep2: (data: { instanceName: string; registrationOpen: boolean; backupEnabled?: boolean; backupCron?: string; backupRetentionDays?: number }) =>
    api.post("/api/setup/step-2", data),

  skipIntegrations: () =>
    api.post("/api/setup/skip-integrations"),

  complete: () =>
    api.post("/api/setup/complete"),
};
