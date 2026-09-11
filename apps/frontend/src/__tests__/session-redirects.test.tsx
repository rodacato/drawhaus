import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { AxiosError, type AxiosAdapter } from "axios";
import { api } from "../api/client";
import { AppRouter } from "../router";
import { renderWithProviders } from "./_helpers/render";

// Excalidraw cannot be imported under vitest; the share and embed routes lazy-load it.
vi.mock("@/components/ExcalidrawCanvas", () => ({ ExcalidrawCanvas: () => null }));
// three.js needs WebGL, which jsdom lacks; the landing and self-host pages lazy-load it.
vi.mock("@/components/AnimatedBackground", () => ({ AnimatedBackground: () => null }));

const START_HREF = "http://localhost/";
const PROTECTED_PATHS = ["/dashboard", "/settings", "/board/some-id"];
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password/some-token",
  "/workspace-invite/some-token",
  "/invite/some-token",
  "/privacy",
  "/terms",
  "/self-host",
  "/setup",
  "/share/some-token",
  "/embed/some-token",
  "/no-such-page",
];

const defaultAdapter = api.defaults.adapter;
let requestedUrls: string[] = [];

function everyRequestFailsWith(status: number, data: unknown = {}): AxiosAdapter {
  return async (config) => {
    requestedUrls.push(config.url ?? "");
    throw new AxiosError(`HTTP ${status}`, "ERR_BAD_REQUEST", config, null, {
      status,
      statusText: "",
      headers: {},
      config,
      data,
    });
  };
}

// BrowserRouter keeps location.pathname in step with the route; the stub has to as well.
function visit(path: string) {
  globalThis.location.pathname = path;
  renderWithProviders(<AppRouter />, { route: path });
}

async function settleRequests() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

beforeEach(() => {
  requestedUrls = [];
  vi.stubGlobal("location", { href: START_HREF, pathname: "/", origin: "http://localhost" });
});

afterEach(() => {
  api.defaults.adapter = defaultAdapter;
  vi.unstubAllGlobals();
});

describe("a 401 response", () => {
  test.each(PROTECTED_PATHS)("on %s sends the visitor to /login", async (path) => {
    api.defaults.adapter = everyRequestFailsWith(401);

    visit(path);

    await waitFor(() => expect(globalThis.location.href).toBe("/login"));
  });

  test.each(PUBLIC_PATHS)("on %s leaves the visitor on the page", async (path) => {
    api.defaults.adapter = everyRequestFailsWith(401);

    visit(path);

    await waitFor(() => expect(requestedUrls).toContain("/api/auth/me"));
    await settleRequests();
    expect(globalThis.location.href).toBe(START_HREF);
  });
});

describe("a 403 setup_required response", () => {
  test("sends the visitor to /setup", async () => {
    api.defaults.adapter = everyRequestFailsWith(403, { error: "setup_required" });

    visit("/dashboard");

    await waitFor(() => expect(globalThis.location.href).toBe("/setup"));
  });

  test("on /setup itself does not reload the page", async () => {
    globalThis.location.pathname = "/setup";
    api.defaults.adapter = everyRequestFailsWith(403, { error: "setup_required" });

    await expect(api.get("/api/setup/status")).rejects.toThrow("HTTP 403");

    expect(globalThis.location.href).toBe(START_HREF);
  });

  test("any other 403 does not redirect", async () => {
    globalThis.location.pathname = "/dashboard";
    api.defaults.adapter = everyRequestFailsWith(403, { error: "forbidden" });

    await expect(api.get("/api/diagrams/some-id")).rejects.toThrow("HTTP 403");

    expect(globalThis.location.href).toBe(START_HREF);
  });
});
