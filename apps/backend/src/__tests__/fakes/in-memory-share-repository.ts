import crypto from "crypto";
import type { ShareRepository } from "../../domain/ports/share-repository";
import type { ShareLink } from "../../domain/entities/share-link";

export class InMemoryShareRepository implements ShareRepository {
  store: ShareLink[] = [];

  async findByToken(token: string): Promise<ShareLink | null> {
    return this.store.find((l) => l.token === token) ?? null;
  }

  async findByDiagram(diagramId: string): Promise<ShareLink[]> {
    return this.store.filter((l) => l.diagramId === diagramId);
  }

  async create(data: {
    diagramId: string;
    createdBy: string;
    role: "editor" | "viewer";
    expiresAt: Date | null;
  }): Promise<ShareLink> {
    const link: ShareLink = {
      token: crypto.randomBytes(24).toString("base64url"),
      diagramId: data.diagramId,
      createdBy: data.createdBy,
      role: data.role,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
    };
    this.store.push(link);
    return link;
  }

  async delete(token: string): Promise<void> {
    this.store = this.store.filter((l) => l.token !== token);
  }

  async findCreatedBy(token: string): Promise<string | null> {
    const link = this.store.find((l) => l.token === token);
    return link?.createdBy ?? null;
  }
}
