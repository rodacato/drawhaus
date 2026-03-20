import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// Mock fetch globally before importing client
const mockFetch = mock.fn<typeof globalThis.fetch>();
globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;

// Now import the module under test
const { DrawhausClient } = await import("../client.js");
const { DrawhausApiError } = await import("../errors.js");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DrawhausClient", () => {
  let client: InstanceType<typeof DrawhausClient>;

  beforeEach(() => {
    mockFetch.mock.resetCalls();
    client = new DrawhausClient("http://localhost:4000", "dhk_test_key_123");
  });

  describe("request headers", () => {
    it("sends Authorization and X-Drawhaus-Client headers", async () => {
      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ status: "ok", version: "0.10.0", database: "ok" }),
      );

      await client.health();

      assert.equal(mockFetch.mock.callCount(), 1);
      const [url, options] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, "http://localhost:4000/v1/health");
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers["Authorization"], "Bearer dhk_test_key_123");
      assert.equal(headers["X-Drawhaus-Client"], "mcp-server");
    });

    it("strips trailing slash from base URL", async () => {
      const c = new DrawhausClient("http://localhost:4000/", "dhk_key");
      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ status: "ok", version: "1.0", database: "ok" }),
      );

      await c.health();
      const [url] = mockFetch.mock.calls[0].arguments;
      assert.equal(url, "http://localhost:4000/v1/health");
    });
  });

  describe("health", () => {
    it("returns health response", async () => {
      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ status: "ok", version: "0.10.0", database: "ok" }),
      );

      const result = await client.health();
      assert.equal(result.status, "ok");
      assert.equal(result.version, "0.10.0");
    });
  });

  describe("createDiagram", () => {
    it("sends POST and returns diagram data", async () => {
      const diagram = {
        id: "abc-123",
        title: "Test",
        url: "http://localhost:5173/board/abc-123",
        createdVia: "api",
        folderId: null,
        elements: [],
        appState: {},
        createdAt: "2026-03-19T10:00:00.000Z",
        updatedAt: "2026-03-19T10:00:00.000Z",
      };

      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ data: diagram }, 201),
      );

      const result = await client.createDiagram({ title: "Test" });
      assert.equal(result.id, "abc-123");
      assert.equal(result.title, "Test");

      const [, options] = mockFetch.mock.calls[0].arguments;
      assert.equal(options?.method, "POST");
      const body = JSON.parse(options?.body as string);
      assert.equal(body.title, "Test");
    });
  });

  describe("listDiagrams", () => {
    it("sends GET with query params", async () => {
      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ data: [], total: 0, limit: 10, offset: 0 }),
      );

      await client.listDiagrams({ limit: 10, offset: 0, folderId: "fold-1" });
      const [url] = mockFetch.mock.calls[0].arguments;
      assert.ok((url as string).includes("limit=10"));
      assert.ok((url as string).includes("offset=0"));
      assert.ok((url as string).includes("folderId=fold-1"));
    });
  });

  describe("getDiagram", () => {
    it("fetches diagram by ID", async () => {
      const diagram = {
        id: "abc-123",
        title: "Test",
        url: "http://localhost:5173/board/abc-123",
        createdVia: "api",
        folderId: null,
        elements: [{ id: "el-1" }],
        appState: { bg: "#fff" },
        createdAt: "2026-03-19T10:00:00.000Z",
        updatedAt: "2026-03-19T10:00:00.000Z",
      };

      mockFetch.mock.mockImplementation(async () => jsonResponse({ data: diagram }));

      const result = await client.getDiagram("abc-123");
      assert.equal(result.id, "abc-123");
      assert.deepEqual(result.elements, [{ id: "el-1" }]);
    });
  });

  describe("updateDiagram", () => {
    it("sends PATCH with body", async () => {
      const diagram = {
        id: "abc-123",
        title: "Updated",
        url: "http://localhost:5173/board/abc-123",
        createdVia: "api",
        folderId: null,
        elements: [],
        appState: {},
        createdAt: "2026-03-19T10:00:00.000Z",
        updatedAt: "2026-03-19T12:00:00.000Z",
      };

      mockFetch.mock.mockImplementation(async () => jsonResponse({ data: diagram }));

      const result = await client.updateDiagram("abc-123", { title: "Updated" });
      assert.equal(result.title, "Updated");

      const [, options] = mockFetch.mock.calls[0].arguments;
      assert.equal(options?.method, "PATCH");
    });
  });

  describe("deleteDiagram", () => {
    it("sends DELETE and returns void", async () => {
      mockFetch.mock.mockImplementation(
        async () => new Response(null, { status: 204 }),
      );

      await client.deleteDiagram("abc-123");

      const [url, options] = mockFetch.mock.calls[0].arguments;
      assert.ok((url as string).endsWith("/v1/diagrams/abc-123"));
      assert.equal(options?.method, "DELETE");
    });
  });

  describe("error handling", () => {
    it("throws DrawhausApiError on 401", async () => {
      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ error: "Invalid API key" }, 401),
      );

      await assert.rejects(() => client.getDiagram("abc"), (error: unknown) => {
        assert.ok(error instanceof DrawhausApiError);
        assert.equal(error.status, 401);
        assert.equal(error.apiMessage, "Invalid API key");
        assert.ok(error.hint.includes("DRAWHAUS_API_KEY"));
        return true;
      });
    });

    it("throws DrawhausApiError on 404", async () => {
      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ error: "Diagram not found" }, 404),
      );

      await assert.rejects(() => client.getDiagram("abc"), (error: unknown) => {
        assert.ok(error instanceof DrawhausApiError);
        assert.equal(error.status, 404);
        assert.ok(error.hint.includes("list_diagrams"));
        return true;
      });
    });

    it("never includes API key in error messages", async () => {
      mockFetch.mock.mockImplementation(async () =>
        jsonResponse({ error: "Server error" }, 500),
      );

      await assert.rejects(() => client.health(), (error: unknown) => {
        const msg = String(error);
        assert.ok(!msg.includes("dhk_test_key_123"));
        return true;
      });
    });
  });
});
