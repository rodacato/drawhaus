import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { installChunkReloadGuard } from "../lib/chunk-reload-guard";

const reload = vi.fn();
let uninstall: () => void = () => {};

function firePreloadError(): Event {
  const event = new Event("vite:preloadError", { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

// A reload starts a fresh page: the old listener is gone and a new one is installed.
function simulatePageReload() {
  uninstall();
  uninstall = installChunkReloadGuard();
}

describe("installChunkReloadGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-11T10:00:00Z"));
    vi.stubGlobal("location", { reload });
    reload.mockClear();
    sessionStorage.clear();
    uninstall = installChunkReloadGuard();
  });

  afterEach(() => {
    uninstall();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("a failed chunk load reloads the page once and swallows the error", () => {
    const event = firePreloadError();
    expect(reload).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  test("a second failure within the window does not reload and lets the error propagate", () => {
    firePreloadError();
    simulatePageReload();
    vi.setSystemTime(new Date("2026-09-11T10:00:05Z"));

    const event = firePreloadError();
    expect(reload).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(false);
  });

  test("a failure after the window has passed reloads again", () => {
    firePreloadError();
    simulatePageReload();
    vi.setSystemTime(new Date("2026-09-11T10:00:11Z"));

    firePreloadError();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  test("a sessionStorage that throws neither crashes nor reloads", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    // dispatchEvent never rethrows a listener's exception; the browser reports it as uncaught.
    const uncaught: unknown[] = [];
    const onError = (e: ErrorEvent) => {
      uncaught.push(e.error);
      e.preventDefault();
    };
    window.addEventListener("error", onError);
    try {
      const event = firePreloadError();
      expect(uncaught).toEqual([]);
      expect(reload).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    } finally {
      window.removeEventListener("error", onError);
    }
  });
});
