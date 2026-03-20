import type { IntegrationSecretsRepository } from "../../domain/ports/integration-secrets-repository";
import { encrypt, decrypt } from "../services/encryption";
import { pool } from "../db";

export class PgIntegrationSecretsRepository implements IntegrationSecretsRepository {
  constructor(private encryptionKey: string) {}

  async get(key: string): Promise<string | null> {
    const { rows } = await pool.query<{
      encrypted_value: string;
      iv: string;
      auth_tag: string;
    }>(
      "SELECT encrypted_value, iv, auth_tag FROM integration_secrets WHERE key = $1",
      [key],
    );

    if (rows.length === 0) return null;

    return decrypt(
      { encrypted: rows[0].encrypted_value, iv: rows[0].iv, authTag: rows[0].auth_tag },
      this.encryptionKey,
    );
  }

  async set(key: string, value: string): Promise<void> {
    const { encrypted, iv, authTag } = encrypt(value, this.encryptionKey);

    await pool.query(
      `INSERT INTO integration_secrets (key, encrypted_value, iv, auth_tag, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (key) DO UPDATE SET encrypted_value = $2, iv = $3, auth_tag = $4, updated_at = now()`,
      [key, encrypted, iv, authTag],
    );
  }

  async delete(key: string): Promise<void> {
    await pool.query("DELETE FROM integration_secrets WHERE key = $1", [key]);
  }

  async listKeys(): Promise<{ key: string; updatedAt: Date }[]> {
    const { rows } = await pool.query<{ key: string; updated_at: Date }>(
      "SELECT key, updated_at FROM integration_secrets ORDER BY key",
    );
    return rows.map((r) => ({ key: r.key, updatedAt: r.updated_at }));
  }
}
