import type { GoogleDriveService, DriveFile, DriveFolder } from "../../domain/ports/google-drive-service";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export class GoogleDriveServiceImpl implements GoogleDriveService {
  async createFolder(accessToken: string, name: string, parentId: string | null): Promise<DriveFolder> {
    const body: Record<string, unknown> = { name, mimeType: FOLDER_MIME };
    if (parentId) body.parents = [parentId];

    const res = await fetch(`${DRIVE_API}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Drive createFolder failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { id: string; name: string };
    return { id: data.id, name: data.name };
  }

  async findFolder(accessToken: string, name: string, parentId: string | null): Promise<DriveFolder | null> {
    const parentClause = parentId ? `and '${parentId}' in parents` : "";
    const q = `name='${name}' and mimeType='${FOLDER_MIME}' ${parentClause} and trashed=false`;

    const res = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Drive findFolder failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { files: { id: string; name: string }[] };
    return data.files[0] ? { id: data.files[0].id, name: data.files[0].name } : null;
  }

  async ensureFolder(accessToken: string, name: string, parentId: string | null): Promise<DriveFolder> {
    const existing = await this.findFolder(accessToken, name, parentId);
    if (existing) return existing;
    return this.createFolder(accessToken, name, parentId);
  }

  async uploadFile(accessToken: string, data: {
    name: string;
    mimeType: string;
    content: Buffer | string;
    folderId: string;
    existingFileId?: string;
  }): Promise<DriveFile> {
    const boundary = "drawhaus_boundary";
    const isUpdate = !!data.existingFileId;

    const metadata: Record<string, unknown> = { name: data.name, mimeType: data.mimeType };
    if (!isUpdate) {
      metadata.parents = [data.folderId];
    }

    const contentStr = typeof data.content === "string" ? data.content : data.content.toString("base64");
    const encoding = typeof data.content === "string" ? "" : "\r\nContent-Transfer-Encoding: base64";

    const multipartBody = [
      `--${boundary}`,
      "Content-Type: application/json; charset=UTF-8\r\n",
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${data.mimeType}${encoding}\r\n`,
      contentStr,
      `--${boundary}--`,
    ].join("\r\n");

    const url = isUpdate
      ? `${UPLOAD_API}/files/${data.existingFileId}?uploadType=multipart&fields=id,name,mimeType,webViewLink`
      : `${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink`;

    const method = isUpdate ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const text = await res.text();
      // If updating a file that was deleted, return a signal to create anew
      if (isUpdate && res.status === 404) {
        return this.uploadFile(accessToken, { ...data, existingFileId: undefined });
      }
      throw new Error(`Drive uploadFile failed (${res.status}): ${text}`);
    }

    return (await res.json()) as DriveFile;
  }
}
