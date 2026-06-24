import { randomBytes } from "node:crypto";
import type { GoogleDriveService, DriveFile, DriveFolder, DriveFileListItem } from "../../domain/ports/google-drive-service";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";

// Exported as `let` so tests can override the bound; production callers should treat as readonly.
export let DRIVE_TIMEOUT_MS = 30_000;

export function __setDriveTimeoutForTest(ms: number): number {
  const previous = DRIVE_TIMEOUT_MS;
  DRIVE_TIMEOUT_MS = ms;
  return previous;
}

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

async function timedFetch(url: string, init: FetchInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DRIVE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || (err as { code?: string }).code === "ABORT_ERR")) {
      throw new Error(`Drive request timed out after ${DRIVE_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function escapeDriveQL(value: string): string {
  return value
    .replaceAll("\0", "")
    .replaceAll(/\\/g, String.raw`\\`)
    .replaceAll(/'/g, String.raw`\'`)
    .replaceAll(/"/g, String.raw`\"`)
    .replaceAll(/\n/g, " ")
    .replaceAll(/\r/g, " ");
}

export class GoogleDriveServiceImpl implements GoogleDriveService {
  async createFolder(accessToken: string, name: string, parentId: string | null): Promise<DriveFolder> {
    const body: Record<string, unknown> = { name, mimeType: FOLDER_MIME };
    if (parentId) body.parents = [parentId];

    const res = await timedFetch(`${DRIVE_API}/files`, {
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
    const parentClause = parentId ? `and '${escapeDriveQL(parentId)}' in parents` : "";
    const q = `name='${escapeDriveQL(name)}' and mimeType='${FOLDER_MIME}' ${parentClause} and trashed=false`;

    const res = await timedFetch(`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`, {
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
    const boundary = `drawhaus_${randomBytes(16).toString("hex")}`;
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

    const res = await timedFetch(url, {
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

  async listFiles(accessToken: string, folderId: string): Promise<DriveFileListItem[]> {
    const q = `'${escapeDriveQL(folderId)}' in parents and trashed=false`;
    const fields = "files(id,name,mimeType,modifiedTime,size)";
    const orderBy = "modifiedTime desc";

    const res = await timedFetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=${encodeURIComponent(orderBy)}&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      throw new Error(`Drive listFiles failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { files: DriveFileListItem[] };
    return data.files;
  }

  async downloadFile(accessToken: string, fileId: string): Promise<string> {
    const res = await timedFetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Drive downloadFile failed (${res.status}): ${await res.text()}`);
    }

    return res.text();
  }
}
