import type { ApiKey } from "../entities/api-key";

export interface ApiKeyRepository {
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;
  findByUserId(userId: string): Promise<ApiKey[]>;
  findById(id: string): Promise<ApiKey | null>;
  create(data: {
    userId: string;
    workspaceId: string;
    name: string;
    keyPrefix: string;
    keyHash: string;
    expiresAt: Date | null;
  }): Promise<ApiKey>;
  revoke(id: string): Promise<void>;
  updateLastUsed(id: string): Promise<void>;
  countActiveByUser(userId: string): Promise<number>;
  logRequest(data: {
    keyId: string;
    method: string;
    path: string;
    statusCode: number;
    ip: string | null;
    userAgent: string | null;
  }): void;
}
