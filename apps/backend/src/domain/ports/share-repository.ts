import type { ShareLink } from "../entities/share-link";

export interface ShareRepository {
  findByToken(token: string): Promise<ShareLink | null>;
  findByDiagram(diagramId: string): Promise<ShareLink[]>;
  create(data: {
    diagramId: string;
    createdBy: string;
    role: "editor" | "viewer";
    expiresAt: Date | null;
  }): Promise<ShareLink>;
  delete(token: string): Promise<void>;
  findCreatedBy(token: string): Promise<string | null>;
}
