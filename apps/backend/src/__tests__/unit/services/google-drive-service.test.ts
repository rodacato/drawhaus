import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { GoogleDriveServiceImpl, __setDriveTimeoutForTest } from "../../../infrastructure/services/google-drive-service";

const BOUNDARY_RE = /^drawhaus_[a-f0-9]{32}$/;

type FetchResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};
type FetchInit = { method?: string; headers?: Record<string, string>; body?: string };
type FetchHandler = (url: string, init?: FetchInit) => FetchResponse | Promise<FetchResponse>;

function installFetchMock(handler: FetchHandler) {
  return mock.method(globalThis, "fetch", async (input: unknown, init?: unknown) => {
    const url = typeof input === "string" ? input : String(input);
    return handler(url, init as FetchInit | undefined) as unknown as Response;
  });
}

function jsonResponse(body: unknown, ok = true, status = 200): FetchResponse {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

function textResponse(text: string, ok = false, status = 400): FetchResponse {
  return { ok, status, json: async () => ({}), text: async () => text };
}

const TOKEN = "test-access-token";

afterEach(() => {
  mock.restoreAll();
});

describe("GoogleDriveServiceImpl.createFolder", () => {
  it("POSTs to /drive/v3/files with name + folder mimeType and parents when parentId is provided", async () => {
    const fetchMock = installFetchMock((url, init) => {
      assert.equal(url, "https://www.googleapis.com/drive/v3/files");
      assert.equal(init?.method, "POST");
      assert.equal(init?.headers?.["Authorization"], `Bearer ${TOKEN}`);
      assert.equal(init?.headers?.["Content-Type"], "application/json");
      const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
      assert.equal(body.name, "My Folder");
      assert.equal(body.mimeType, "application/vnd.google-apps.folder");
      assert.deepEqual(body.parents, ["parent-id-1"]);
      return jsonResponse({ id: "folder-1", name: "My Folder" });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.createFolder(TOKEN, "My Folder", "parent-id-1");

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.deepEqual(result, { id: "folder-1", name: "My Folder" });
  });

  it("omits the `parents` field when parentId is null", async () => {
    const fetchMock = installFetchMock((_url, init) => {
      const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
      assert.equal(body.name, "Root Folder");
      assert.equal(body.mimeType, "application/vnd.google-apps.folder");
      assert.equal("parents" in body, false, "parents must not be present when parentId is null");
      return jsonResponse({ id: "root-1", name: "Root Folder" });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.createFolder(TOKEN, "Root Folder", null);

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.deepEqual(result, { id: "root-1", name: "Root Folder" });
  });

  it("throws with status and body text when the API returns a non-ok response", async () => {
    installFetchMock(() => textResponse("forbidden", false, 403));
    const service = new GoogleDriveServiceImpl();

    await assert.rejects(
      () => service.createFolder(TOKEN, "X", null),
      (err: unknown) =>
        err instanceof Error && err.message === "Drive createFolder failed (403): forbidden",
    );
  });
});

describe("GoogleDriveServiceImpl.findFolder", () => {
  it("builds a Drive query with `in parents` clause when parentId is provided and returns the first file", async () => {
    const fetchMock = installFetchMock((url, init) => {
      assert.ok(url.startsWith("https://www.googleapis.com/drive/v3/files?q="));
      assert.equal(init?.headers?.["Authorization"], `Bearer ${TOKEN}`);
      const u = new URL(url);
      const q = u.searchParams.get("q") ?? "";
      assert.match(q, /name='Reports'/);
      assert.match(q, /mimeType='application\/vnd\.google-apps\.folder'/);
      assert.match(q, /'parent-1' in parents/);
      assert.match(q, /trashed=false/);
      assert.equal(u.searchParams.get("fields"), "files(id,name)");
      assert.equal(u.searchParams.get("pageSize"), "1");
      return jsonResponse({ files: [{ id: "f-1", name: "Reports" }, { id: "f-2", name: "Other" }] });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.findFolder(TOKEN, "Reports", "parent-1");

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.deepEqual(result, { id: "f-1", name: "Reports" });
  });

  it("omits the `in parents` clause when parentId is null", async () => {
    installFetchMock((url) => {
      const q = new URL(url).searchParams.get("q") ?? "";
      assert.doesNotMatch(q, /in parents/);
      return jsonResponse({ files: [{ id: "f-x", name: "Top" }] });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.findFolder(TOKEN, "Top", null);

    assert.deepEqual(result, { id: "f-x", name: "Top" });
  });

  it("returns null when the files array is empty", async () => {
    installFetchMock(() => jsonResponse({ files: [] }));
    const service = new GoogleDriveServiceImpl();

    const result = await service.findFolder(TOKEN, "Missing", null);

    assert.equal(result, null);
  });

  it("throws with status and body text when the API returns a non-ok response", async () => {
    installFetchMock(() => textResponse("unauthorized", false, 401));
    const service = new GoogleDriveServiceImpl();

    await assert.rejects(
      () => service.findFolder(TOKEN, "X", null),
      (err: unknown) =>
        err instanceof Error && err.message === "Drive findFolder failed (401): unauthorized",
    );
  });

  it("escapes single-quote and backslash in the folder name via the Drive QL escape helper", async () => {
    const fetchMock = installFetchMock(() => jsonResponse({ files: [] }));
    const service = new GoogleDriveServiceImpl();

    await service.findFolder(TOKEN, "O'Brien\\'s folder", null);

    const url = fetchMock.mock.calls[0].arguments[0] as string;
    const q = new URL(url).searchParams.get("q") ?? "";
    assert.match(q, /name='O\\'Brien\\\\\\'s folder'/);
  });
});

describe("GoogleDriveServiceImpl.ensureFolder", () => {
  it("returns the existing folder and does not call createFolder when findFolder finds one", async () => {
    let callCount = 0;
    const fetchMock = installFetchMock((url, init) => {
      callCount++;
      assert.equal(init?.method ?? "GET", "GET");
      assert.ok(url.includes("/drive/v3/files?q="));
      return jsonResponse({ files: [{ id: "existing-1", name: "Stuff" }] });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.ensureFolder(TOKEN, "Stuff", null);

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.equal(callCount, 1, "must not call createFolder when find returns a result");
    assert.deepEqual(result, { id: "existing-1", name: "Stuff" });
  });

  it("calls findFolder then createFolder (in that order) when findFolder returns null", async () => {
    const seenMethods: string[] = [];
    const fetchMock = installFetchMock((url, init) => {
      seenMethods.push(init?.method ?? "GET");
      if (!init?.method || init.method === "GET") {
        assert.ok(url.includes("?q="));
        return jsonResponse({ files: [] });
      }
      assert.equal(url, "https://www.googleapis.com/drive/v3/files");
      return jsonResponse({ id: "new-1", name: "Stuff" });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.ensureFolder(TOKEN, "Stuff", "parent-x");

    assert.equal(fetchMock.mock.calls.length, 2);
    assert.deepEqual(seenMethods, ["GET", "POST"]);
    assert.deepEqual(result, { id: "new-1", name: "Stuff" });
  });
});

describe("GoogleDriveServiceImpl.uploadFile", () => {
  it("on create (no existingFileId): POSTs to upload endpoint with multipart body containing metadata + content and folderId in parents", async () => {
    const fetchMock = installFetchMock((url, init) => {
      assert.equal(
        url,
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
      );
      assert.equal(init?.method, "POST");
      assert.equal(init?.headers?.["Authorization"], `Bearer ${TOKEN}`);
      const ct = init?.headers?.["Content-Type"] ?? "";
      const boundaryMatch = ct.match(/^multipart\/related; boundary=(drawhaus_[a-f0-9]{32})$/);
      assert.ok(boundaryMatch, `Content-Type must use a random boundary, got: ${ct}`);
      const boundary = boundaryMatch[1];
      const body = init?.body ?? "";
      assert.ok(body.includes(`--${boundary}`));
      assert.ok(body.includes(`--${boundary}--`), "must terminate the multipart envelope");
      const metaMatch = body.match(/\{"name":"[^}]+\}/);
      assert.ok(metaMatch, "metadata JSON segment must appear in body");
      const meta = JSON.parse(metaMatch[0]) as Record<string, unknown>;
      assert.equal(meta.name, "draw.json");
      assert.equal(meta.mimeType, "application/json");
      assert.deepEqual(meta.parents, ["folder-99"]);
      assert.ok(body.includes("raw-content"));
      return jsonResponse({
        id: "file-1",
        name: "draw.json",
        mimeType: "application/json",
        webViewLink: "https://example",
      });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.uploadFile(TOKEN, {
      name: "draw.json",
      mimeType: "application/json",
      content: "raw-content",
      folderId: "folder-99",
    });

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.equal(result.id, "file-1");
  });

  it("on update (with existingFileId): PATCHes to /files/<id> and omits `parents` from metadata", async () => {
    const fetchMock = installFetchMock((url, init) => {
      assert.equal(
        url,
        "https://www.googleapis.com/upload/drive/v3/files/existing-77?uploadType=multipart&fields=id,name,mimeType,webViewLink",
      );
      assert.equal(init?.method, "PATCH");
      const body = init?.body ?? "";
      const metaMatch = body.match(/\{"name":"[^}]+\}/);
      assert.ok(metaMatch);
      const meta = JSON.parse(metaMatch[0]) as Record<string, unknown>;
      assert.equal(meta.name, "draw.json");
      assert.equal("parents" in meta, false, "update path must not set parents");
      return jsonResponse({
        id: "existing-77",
        name: "draw.json",
        mimeType: "application/json",
        webViewLink: "https://example",
      });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.uploadFile(TOKEN, {
      name: "draw.json",
      mimeType: "application/json",
      content: "raw-content",
      folderId: "folder-99",
      existingFileId: "existing-77",
    });

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.equal(result.id, "existing-77");
  });

  it("Buffer content is base64-encoded and the multipart sets `Content-Transfer-Encoding: base64`", async () => {
    const fetchMock = installFetchMock(() =>
      jsonResponse({ id: "f-1", name: "x", mimeType: "application/octet-stream", webViewLink: "x" }),
    );
    const service = new GoogleDriveServiceImpl();
    const buf = Buffer.from("hello-binary", "utf8");

    await service.uploadFile(TOKEN, {
      name: "x.bin",
      mimeType: "application/octet-stream",
      content: buf,
      folderId: "fld",
    });

    const init = fetchMock.mock.calls[0].arguments[1] as FetchInit;
    const body = init.body ?? "";
    assert.match(body, /Content-Transfer-Encoding: base64/);
    assert.ok(body.includes(buf.toString("base64")), "base64-encoded payload must appear in body");
    assert.ok(!body.includes("hello-binary"), "raw utf8 bytes must NOT appear when content is a Buffer");
  });

  it("String content is sent raw with no `Content-Transfer-Encoding` header in the multipart", async () => {
    const fetchMock = installFetchMock(() =>
      jsonResponse({ id: "f-2", name: "x", mimeType: "text/plain", webViewLink: "x" }),
    );
    const service = new GoogleDriveServiceImpl();

    await service.uploadFile(TOKEN, {
      name: "x.txt",
      mimeType: "text/plain",
      content: "raw-string-content",
      folderId: "fld",
    });

    const init = fetchMock.mock.calls[0].arguments[1] as FetchInit;
    const body = init.body ?? "";
    assert.doesNotMatch(body, /Content-Transfer-Encoding: base64/);
    assert.ok(body.includes("raw-string-content"));
  });

  it("on 404 during update: retries as a fresh create (POST) and returns the new file", async () => {
    const seenMethods: string[] = [];
    const seenUrls: string[] = [];
    const fetchMock = installFetchMock((url, init) => {
      seenUrls.push(url);
      seenMethods.push(init?.method ?? "GET");
      if (init?.method === "PATCH") {
        return textResponse("not found", false, 404);
      }
      return jsonResponse({
        id: "recreated-1",
        name: "draw.json",
        mimeType: "application/json",
        webViewLink: "https://example",
      });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.uploadFile(TOKEN, {
      name: "draw.json",
      mimeType: "application/json",
      content: "raw-content",
      folderId: "folder-99",
      existingFileId: "deleted-id",
    });

    assert.equal(fetchMock.mock.calls.length, 2, "must retry once after 404 on PATCH");
    assert.deepEqual(seenMethods, ["PATCH", "POST"]);
    assert.ok(seenUrls[0].includes("/files/deleted-id"));
    assert.ok(!seenUrls[1].includes("/files/deleted-id"));
    assert.equal(result.id, "recreated-1");
  });

  it("throws on non-404 failure with status and body text", async () => {
    installFetchMock(() => textResponse("server error", false, 500));
    const service = new GoogleDriveServiceImpl();

    await assert.rejects(
      () =>
        service.uploadFile(TOKEN, {
          name: "x",
          mimeType: "text/plain",
          content: "y",
          folderId: "fld",
        }),
      (err: unknown) =>
        err instanceof Error && err.message === "Drive uploadFile failed (500): server error",
    );
  });

  it("throws on 404 when there is no existingFileId (create path; no retry)", async () => {
    let calls = 0;
    installFetchMock(() => {
      calls++;
      return textResponse("not found", false, 404);
    });
    const service = new GoogleDriveServiceImpl();

    await assert.rejects(
      () =>
        service.uploadFile(TOKEN, {
          name: "x",
          mimeType: "text/plain",
          content: "y",
          folderId: "fld",
        }),
      (err: unknown) =>
        err instanceof Error && err.message === "Drive uploadFile failed (404): not found",
    );
    assert.equal(calls, 1, "create path must not retry on 404");
  });
});

describe("GoogleDriveServiceImpl.listFiles", () => {
  it("builds the listing query with `in parents and trashed=false`, fields, orderBy and pageSize=100", async () => {
    const fetchMock = installFetchMock((url, init) => {
      assert.ok(url.startsWith("https://www.googleapis.com/drive/v3/files?q="));
      assert.equal(init?.headers?.["Authorization"], `Bearer ${TOKEN}`);
      const u = new URL(url);
      const q = u.searchParams.get("q") ?? "";
      assert.match(q, /'folder-42' in parents/);
      assert.match(q, /trashed=false/);
      assert.equal(u.searchParams.get("fields"), "files(id,name,mimeType,modifiedTime,size)");
      assert.equal(u.searchParams.get("orderBy"), "modifiedTime desc");
      assert.equal(u.searchParams.get("pageSize"), "100");
      return jsonResponse({
        files: [
          { id: "a", name: "a.json", mimeType: "application/json", modifiedTime: "2026-06-23T00:00:00Z" },
        ],
      });
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.listFiles(TOKEN, "folder-42");

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "a");
  });

  it("throws with status and body text when the API returns a non-ok response", async () => {
    installFetchMock(() => textResponse("rate limited", false, 429));
    const service = new GoogleDriveServiceImpl();

    await assert.rejects(
      () => service.listFiles(TOKEN, "fld"),
      (err: unknown) =>
        err instanceof Error && err.message === "Drive listFiles failed (429): rate limited",
    );
  });
});

describe("GoogleDriveServiceImpl.downloadFile", () => {
  it("GETs /files/<id>?alt=media with bearer token and returns the response body as text", async () => {
    const fetchMock = installFetchMock((url, init) => {
      assert.equal(url, "https://www.googleapis.com/drive/v3/files/file-7?alt=media");
      assert.equal(init?.headers?.["Authorization"], `Bearer ${TOKEN}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "raw-downloaded-bytes",
      };
    });
    const service = new GoogleDriveServiceImpl();

    const result = await service.downloadFile(TOKEN, "file-7");

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.equal(result, "raw-downloaded-bytes");
  });

  it("throws with status and body text when the API returns a non-ok response", async () => {
    installFetchMock(() => textResponse("gone", false, 410));
    const service = new GoogleDriveServiceImpl();

    await assert.rejects(
      () => service.downloadFile(TOKEN, "file-7"),
      (err: unknown) =>
        err instanceof Error && err.message === "Drive downloadFile failed (410): gone",
    );
  });
});

describe("GoogleDriveServiceImpl timeout", () => {
  it("aborts and throws a clear timeout error when the Drive API never responds", async () => {
    const previous = __setDriveTimeoutForTest(20);
    try {
      mock.method(globalThis, "fetch", (_input: unknown, init?: unknown) => {
        const signal = (init as { signal?: AbortSignal } | undefined)?.signal;
        return new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });
      const service = new GoogleDriveServiceImpl();

      await assert.rejects(
        () => service.findFolder(TOKEN, "anything", null),
        (err: unknown) => err instanceof Error && err.message === "Drive request timed out after 20ms",
      );
    } finally {
      __setDriveTimeoutForTest(previous);
    }
  });

  it("passes an AbortSignal to fetch on every call", async () => {
    const fetchMock = installFetchMock((_url, init) => {
      const signal = (init as unknown as { signal?: AbortSignal }).signal;
      assert.ok(signal instanceof AbortSignal, "every Drive fetch must carry an AbortSignal");
      return jsonResponse({ files: [] });
    });
    const service = new GoogleDriveServiceImpl();

    await service.findFolder(TOKEN, "x", null);

    assert.equal(fetchMock.mock.calls.length, 1);
  });
});

describe("GoogleDriveServiceImpl.uploadFile boundary randomness", () => {
  it("uses a different random boundary on each call", async () => {
    const seenBoundaries: string[] = [];
    installFetchMock((_url, init) => {
      const ct = init?.headers?.["Content-Type"] ?? "";
      const m = ct.match(/boundary=(drawhaus_[a-f0-9]{32})/);
      assert.ok(m, `boundary must match pattern, got: ${ct}`);
      seenBoundaries.push(m[1]);
      return jsonResponse({ id: "f", name: "x", mimeType: "text/plain", webViewLink: "x" });
    });
    const service = new GoogleDriveServiceImpl();

    await service.uploadFile(TOKEN, { name: "a", mimeType: "text/plain", content: "y", folderId: "fld" });
    await service.uploadFile(TOKEN, { name: "b", mimeType: "text/plain", content: "y", folderId: "fld" });

    assert.equal(seenBoundaries.length, 2);
    assert.ok(BOUNDARY_RE.test(seenBoundaries[0]));
    assert.ok(BOUNDARY_RE.test(seenBoundaries[1]));
    assert.notEqual(seenBoundaries[0], seenBoundaries[1], "consecutive uploads must use different boundaries");
  });
});

describe("escapeDriveQL (via findFolder)", () => {
  it("escapes double quotes in the folder name", async () => {
    const fetchMock = installFetchMock(() => jsonResponse({ files: [] }));
    const service = new GoogleDriveServiceImpl();

    await service.findFolder(TOKEN, 'has "quotes" inside', null);

    const url = fetchMock.mock.calls[0].arguments[0] as string;
    const q = new URL(url).searchParams.get("q") ?? "";
    assert.match(q, /name='has \\"quotes\\" inside'/);
  });

  it("replaces newlines and carriage returns with a space, and strips null bytes", async () => {
    const fetchMock = installFetchMock(() => jsonResponse({ files: [] }));
    const service = new GoogleDriveServiceImpl();

    await service.findFolder(TOKEN, "line1\nline2\rline3\0tail", null);

    const url = fetchMock.mock.calls[0].arguments[0] as string;
    const q = new URL(url).searchParams.get("q") ?? "";
    assert.match(q, /name='line1 line2 line3tail'/);
    assert.doesNotMatch(q, /\n/);
    assert.doesNotMatch(q, /\r/);
    assert.doesNotMatch(q, /\0/);
  });
});
