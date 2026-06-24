import type { IntegrationSecretsRepository } from "../../domain/ports/integration-secrets-repository";
import { logger } from "../logger";

const CACHE_TTL = 60_000;

export class ConfigProvider {
  private readonly cache = new Map<string, { value: string; time: number }>();

  constructor(private readonly secretsRepo: IntegrationSecretsRepository | null) {}

  async get(key: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return cached.value;
    }

    // Try DB first
    if (this.secretsRepo) {
      try {
        const dbValue = await this.secretsRepo.get(key);
        if (dbValue) {
          this.cache.set(key, { value: dbValue, time: Date.now() });
          return dbValue;
        }
      } catch (err) {
        logger.warn({ err, key }, "ConfigProvider: DB read failed, falling back to env");
      }
    }

    // Fallback to env var
    const envValue = process.env[key] ?? "";
    this.cache.set(key, { value: envValue, time: Date.now() });
    return envValue;
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}
