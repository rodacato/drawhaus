export const CRON_HINT = "Crontab syntax, UTC. Default: 0 3 * * * (daily at 3AM).";

type NumericRule = { label: string; min: number; max: number };

const RULES = {
  maxWorkspacesPerUser: { label: "Max Workspaces per User", min: 1, max: 50 },
  maxMembersPerWorkspace: { label: "Max Members per Workspace", min: 1, max: 100 },
  backupRetentionDays: { label: "Retention (days)", min: 1, max: 365 },
} satisfies Record<string, NumericRule>;

export type NumericField = keyof typeof RULES;
export type SiteSettingsErrors = Partial<Record<NumericField | "backupCron", string>>;

export function validateWholeNumber(field: NumericField, raw: string): string | null {
  const { label, min, max } = RULES[field];
  const value = Number(raw);
  if (raw.trim() === "" || !Number.isInteger(value) || value < min || value > max) {
    return `${label} must be a whole number from ${min} to ${max}.`;
  }
  return null;
}

export function validateCron(raw: string): string | null {
  return /^\S+(\s+\S+){4}$/.test(raw.trim())
    ? null
    : "Enter five space-separated fields, for example 0 3 * * *.";
}

export function validateSiteSettings(values: {
  maxWorkspacesPerUser: string;
  maxMembersPerWorkspace: string;
  backupEnabled: boolean;
  backupCron: string;
  backupRetentionDays: string;
}): SiteSettingsErrors {
  const errors: SiteSettingsErrors = {};
  for (const field of ["maxWorkspacesPerUser", "maxMembersPerWorkspace"] as const) {
    const message = validateWholeNumber(field, values[field]);
    if (message) errors[field] = message;
  }
  if (values.backupEnabled) {
    const retention = validateWholeNumber("backupRetentionDays", values.backupRetentionDays);
    if (retention) errors.backupRetentionDays = retention;
    const cron = validateCron(values.backupCron);
    if (cron) errors.backupCron = cron;
  }
  return errors;
}
