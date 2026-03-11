import { api } from "./client";

export type DriveStatus = {
  connected: boolean;
  autoBackupEnabled: boolean;
  scopes: string;
};

export const driveApi = {
  getStatus: () => api.get<DriveStatus>("/api/drive/status").then((r) => r.data),
  toggleBackup: (enabled: boolean) => api.post<{ enabled: boolean }>("/api/drive/backup/toggle", { enabled }).then((r) => r.data),
  disconnect: () => api.post("/api/drive/disconnect").then((r) => r.data),
  export: (data: { format: string; targetFolderId: string; content: string; fileName: string }) =>
    api.post<{ driveFileId: string; webViewLink: string }>("/api/drive/export", data).then((r) => r.data),
  getPickerToken: () => api.get<{ accessToken: string }>("/api/drive/picker-token").then((r) => r.data),
};
