import { describe, test, beforeEach, vi } from "vitest";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { driveApi } from "../api/drive";

describe("driveApi", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("getStatus calls /api/drive/status", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ connected: true, autoBackupEnabled: false, scopes: "" });
    await driveApi.getStatus();
    assert.deepEqual(stub.mock.calls[0], ["/api/drive/status"]);
  });

  test("toggleBackup posts enabled flag", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ enabled: true });
    await driveApi.toggleBackup(true);
    assert.deepEqual(stub.mock.calls[0], ["/api/drive/backup/toggle", { enabled: true }]);
  });

  test("disconnect posts with no body", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({});
    await driveApi.disconnect();
    assert.deepEqual(stub.mock.calls[0], ["/api/drive/disconnect"]);
  });

  test("export posts full payload", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ driveFileId: "df1", webViewLink: "https://x" });
    await driveApi.export({ format: "png", targetFolderId: "tf1", content: "data:...", fileName: "x.png" });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/drive/export",
      { format: "png", targetFolderId: "tf1", content: "data:...", fileName: "x.png" },
    ]);
  });

  test("getPickerToken calls /api/drive/picker-token", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ accessToken: "tok" });
    await driveApi.getPickerToken();
    assert.deepEqual(stub.mock.calls[0], ["/api/drive/picker-token"]);
  });

  test("listFiles passes empty params when no folderId", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ files: [], currentFolderId: "" });
    await driveApi.listFiles();
    assert.deepEqual(stub.mock.calls[0], ["/api/drive/files", { params: {} }]);
  });

  test("listFiles passes folderId param when provided", async () => {
    const stub = vi.spyOn(api, "get").mockResolvedValue({ files: [], currentFolderId: "f1" });
    await driveApi.listFiles("f1");
    assert.deepEqual(stub.mock.calls[0], ["/api/drive/files", { params: { folderId: "f1" } }]);
  });

  test("importFile posts fileId+fileName", async () => {
    const stub = vi.spyOn(api, "post").mockResolvedValue({ diagramId: "d1", title: "x" });
    await driveApi.importFile({ fileId: "drv1", fileName: "x.draw" });
    assert.deepEqual(stub.mock.calls[0], [
      "/api/drive/import",
      { fileId: "drv1", fileName: "x.draw" },
    ]);
  });
});
