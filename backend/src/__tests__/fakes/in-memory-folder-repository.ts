import crypto from "crypto";
import type { FolderRepository } from "../../domain/ports/folder-repository";
import type { Folder } from "../../domain/entities/folder";

export class InMemoryFolderRepository implements FolderRepository {
  store: Folder[] = [];

  async findById(id: string): Promise<Folder | null> {
    return this.store.find((f) => f.id === id) ?? null;
  }

  async findByUser(userId: string): Promise<Folder[]> {
    return this.store.filter((f) => f.ownerId === userId);
  }

  async findByWorkspace(workspaceId: string): Promise<Folder[]> {
    return this.store.filter((f) => f.workspaceId === workspaceId);
  }

  async create(data: { ownerId: string; workspaceId?: string | null; name: string }): Promise<Folder> {
    const folder: Folder = {
      id: crypto.randomUUID(),
      ownerId: data.ownerId,
      workspaceId: data.workspaceId ?? null,
      name: data.name,
      createdAt: new Date(),
    };
    this.store.push(folder);
    return folder;
  }

  async rename(id: string, name: string): Promise<Folder | null> {
    const folder = this.store.find((f) => f.id === id);
    if (!folder) return null;
    folder.name = name;
    return folder;
  }

  async delete(id: string): Promise<void> {
    this.store = this.store.filter((f) => f.id !== id);
  }
}
