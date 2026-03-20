export type ApiKey = {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export function isApiKeyActive(key: ApiKey): boolean {
  if (key.revokedAt) return false;
  if (key.expiresAt && key.expiresAt < new Date()) return false;
  return true;
}
