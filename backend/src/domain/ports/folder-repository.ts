import type { Folder } from "../entities/folder";

export interface FolderRepository {
  findById(id: string): Promise<Folder | null>;
  findByUser(userId: string): Promise<Folder[]>;
  create(data: { ownerId: string; name: string }): Promise<Folder>;
  rename(id: string, name: string): Promise<Folder | null>;
  delete(id: string): Promise<void>;
}
