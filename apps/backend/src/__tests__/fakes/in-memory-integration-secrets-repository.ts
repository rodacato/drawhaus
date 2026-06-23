import type { IntegrationSecretsRepository } from "../../domain/ports/integration-secrets-repository";

export class InMemoryIntegrationSecretsRepository implements IntegrationSecretsRepository {
  store: Map<string, { value: string; updatedAt: Date }> = new Map();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    return entry ? entry.value : null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, { value, updatedAt: new Date() });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async listKeys(): Promise<{ key: string; updatedAt: Date }[]> {
    return [...this.store.entries()].map(([key, { updatedAt }]) => ({ key, updatedAt }));
  }
}
