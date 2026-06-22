import crypto from "crypto";
import type { DriveBackupRepository } from "../../domain/ports/drive-backup-repository";
import type { DriveBackupSettings, DriveFileMapping } from "../../domain/entities/drive-backup";

export class InMemoryDriveBackupRepository implements DriveBackupRepository {
  settings = new Map<string, DriveBackupSettings>();
  mappings: DriveFileMapping[] = [];

  async getSettings(userId: string): Promise<DriveBackupSettings | null> {
    return this.settings.get(userId) ?? null;
  }

  async upsertSettings(userId: string, data: { enabled: boolean; rootFolderId?: string | null }): Promise<DriveBackupSettings> {
    const existing = this.settings.get(userId);
    const next: DriveBackupSettings = {
      userId,
      enabled: data.enabled,
      rootFolderId: data.rootFolderId !== undefined ? data.rootFolderId : existing?.rootFolderId ?? null,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.settings.set(userId, next);
    return next;
  }

  async deleteSettings(userId: string): Promise<void> {
    this.settings.delete(userId);
    this.mappings = this.mappings.filter((m) => m.userId !== userId);
  }

  async getFileMapping(userId: string, diagramId: string, sceneId: string | null): Promise<DriveFileMapping | null> {
    return this.mappings.find(
      (m) => m.userId === userId && m.diagramId === diagramId && m.sceneId === sceneId,
    ) ?? null;
  }

  async upsertFileMapping(data: {
    userId: string;
    diagramId: string;
    sceneId: string | null;
    driveFileId: string;
    driveFolderId: string;
  }): Promise<DriveFileMapping> {
    const existing = this.mappings.find(
      (m) => m.userId === data.userId && m.diagramId === data.diagramId && m.sceneId === data.sceneId,
    );
    if (existing) {
      existing.driveFileId = data.driveFileId;
      existing.driveFolderId = data.driveFolderId;
      existing.lastSyncedAt = new Date();
      return existing;
    }
    const mapping: DriveFileMapping = {
      id: crypto.randomUUID(),
      ...data,
      lastSyncedAt: new Date(),
    };
    this.mappings.push(mapping);
    return mapping;
  }

  async deleteFileMappings(userId: string, diagramId: string): Promise<void> {
    this.mappings = this.mappings.filter((m) => !(m.userId === userId && m.diagramId === diagramId));
  }
}
