import test, { describe, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { api } from "../api/client";
import { driveApi } from "../api/drive";

describe("driveApi", () => {
  beforeEach(() => mock.restoreAll());

  test("getStatus calls /api/drive/status", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ connected: true, autoBackupEnabled: false, scopes: "" }));
    await driveApi.getStatus();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/drive/status"]);
  });

  test("toggleBackup posts enabled flag", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ enabled: true }));
    await driveApi.toggleBackup(true);
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/drive/backup/toggle", { enabled: true }]);
  });

  test("disconnect posts with no body", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({}));
    await driveApi.disconnect();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/drive/disconnect"]);
  });

  test("export posts full payload", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ driveFileId: "df1", webViewLink: "https://x" }));
    await driveApi.export({ format: "png", targetFolderId: "tf1", content: "data:...", fileName: "x.png" });
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/drive/export",
      { format: "png", targetFolderId: "tf1", content: "data:...", fileName: "x.png" },
    ]);
  });

  test("getPickerToken calls /api/drive/picker-token", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ accessToken: "tok" }));
    await driveApi.getPickerToken();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/drive/picker-token"]);
  });

  test("listFiles passes empty params when no folderId", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ files: [], currentFolderId: "" }));
    await driveApi.listFiles();
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/drive/files", { params: {} }]);
  });

  test("listFiles passes folderId param when provided", async () => {
    const stub = mock.method(api, "get", () => Promise.resolve({ files: [], currentFolderId: "f1" }));
    await driveApi.listFiles("f1");
    assert.deepEqual(stub.mock.calls[0].arguments, ["/api/drive/files", { params: { folderId: "f1" } }]);
  });

  test("importFile posts fileId+fileName", async () => {
    const stub = mock.method(api, "post", () => Promise.resolve({ diagramId: "d1", title: "x" }));
    await driveApi.importFile({ fileId: "drv1", fileName: "x.draw" });
    assert.deepEqual(stub.mock.calls[0].arguments, [
      "/api/drive/import",
      { fileId: "drv1", fileName: "x.draw" },
    ]);
  });
});
