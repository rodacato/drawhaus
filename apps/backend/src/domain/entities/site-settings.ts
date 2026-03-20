export type SiteSettings = {
  registrationOpen: boolean;
  instanceName: string;
  maintenanceMode: boolean;
  maxWorkspacesPerUser: number;
  maxMembersPerWorkspace: number;
  setupCompleted: boolean;
  setupSkippedIntegrations: boolean;
  backupEnabled: boolean;
  backupCron: string;
  backupRetentionDays: number;
};
