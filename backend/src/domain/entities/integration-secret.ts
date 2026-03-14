export type IntegrationSecret = {
  key: string;
  value: string;
  updatedAt: Date;
};

export const INTEGRATION_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "RESEND_API_KEY",
  "FROM_EMAIL",
] as const;

export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];
