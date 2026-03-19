import { api } from "./client";

export type ApiKeyResponse = {
  id: string;
  name: string;
  workspaceId: string;
  keyPrefix: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

export const apiKeysApi = {
  list: () =>
    api.get<{ keys: ApiKeyResponse[] }>("/api/api-keys"),

  create: (data: { name: string; workspaceId: string; expiresAt?: string }) =>
    api.post<{ key: ApiKeyResponse; plainKey: string }>("/api/api-keys", data),

  revoke: (id: string) =>
    api.delete(`/api/api-keys/${id}`),
};
