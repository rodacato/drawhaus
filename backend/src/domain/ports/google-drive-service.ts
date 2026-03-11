export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
};

export type DriveFolder = {
  id: string;
  name: string;
};

export interface GoogleDriveService {
  createFolder(accessToken: string, name: string, parentId: string | null): Promise<DriveFolder>;
  findFolder(accessToken: string, name: string, parentId: string | null): Promise<DriveFolder | null>;
  ensureFolder(accessToken: string, name: string, parentId: string | null): Promise<DriveFolder>;
  uploadFile(accessToken: string, data: {
    name: string;
    mimeType: string;
    content: Buffer | string;
    folderId: string;
    existingFileId?: string;
  }): Promise<DriveFile>;
}
