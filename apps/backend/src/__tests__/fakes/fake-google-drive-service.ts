import type { DriveFile, DriveFolder, DriveFileListItem, GoogleDriveService } from "../../domain/ports/google-drive-service";

export class FakeGoogleDriveService implements GoogleDriveService {
  uploads: { name: string; mimeType: string; folderId: string }[] = [];
  files: DriveFileListItem[] = [];
  contentByFileId = new Map<string, string>();

  async createFolder(_token: string, name: string, _parentId: string | null): Promise<DriveFolder> {
    return { id: `folder-${name}`, name };
  }

  async findFolder(_token: string, _name: string, _parentId: string | null): Promise<DriveFolder | null> {
    return null;
  }

  async ensureFolder(_token: string, name: string, _parentId: string | null): Promise<DriveFolder> {
    return { id: `folder-${name}`, name };
  }

  async uploadFile(_token: string, data: {
    name: string;
    mimeType: string;
    content: Buffer | string;
    folderId: string;
    existingFileId?: string;
  }): Promise<DriveFile> {
    this.uploads.push({ name: data.name, mimeType: data.mimeType, folderId: data.folderId });
    return {
      id: data.existingFileId ?? `file-${this.uploads.length}`,
      name: data.name,
      mimeType: data.mimeType,
      webViewLink: `https://drive.example/${data.name}`,
    };
  }

  async listFiles(_token: string, _folderId: string): Promise<DriveFileListItem[]> {
    return [...this.files];
  }

  async downloadFile(_token: string, fileId: string): Promise<string> {
    const content = this.contentByFileId.get(fileId);
    if (content === undefined) throw new Error(`Drive fake: no content for ${fileId}`);
    return content;
  }
}
