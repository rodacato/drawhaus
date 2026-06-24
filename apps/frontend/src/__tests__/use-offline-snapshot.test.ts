import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createExcalidrawApiStub, makeRef } from "./_helpers/mock-socket";
import type { ConnectionState } from "../lib/types";

vi.mock("../lib/offline-storage", () => ({
  saveOfflineSnapshot: vi.fn(async () => undefined),
  getOfflineSnapshot: vi.fn(async () => null),
  deleteOfflineSnapshot: vi.fn(async () => undefined),
}));

import { useOfflineSnapshot } from "../lib/hooks/collaboration/useOfflineSnapshot";
import * as offlineStorage from "../lib/offline-storage";

const OFFLINE_GRACE_MS = 5 * 60 * 1000;

type RenderOpts = {
  initialConnection?: ConnectionState;
  api?: ReturnType<typeof createExcalidrawApiStub> | null;
  selfUserId?: string | null;
  selfUserName?: string;
  onOfflineSave?: ReturnType<typeof vi.fn>;
  onConflict?: ReturnType<typeof vi.fn>;
  diagramId?: string;
};

function renderOffline(opts: RenderOpts = {}) {
  const api = opts.api === null ? null : (opts.api ?? createExcalidrawApiStub({ elements: [{ id: "e1" }] }));
  const excalidrawApiRef = makeRef(api);
  const selfUserId = "selfUserId" in opts ? opts.selfUserId ?? null : "user-1";
  const initialProps = {
    connection: opts.initialConnection ?? "connected" as ConnectionState,
  };
  const hook = renderHook(
    ({ connection }) =>
      useOfflineSnapshot({
        diagramId: opts.diagramId ?? "diag-1",
        connectionState: connection,
        excalidrawApiRef: excalidrawApiRef as never,
        selfUserId,
        selfUserName: opts.selfUserName,
        onOfflineSave: opts.onOfflineSave,
        onConflict: opts.onConflict,
      }),
    { initialProps },
  );
  return { ...hook, api, excalidrawApiRef };
}

describe("useOfflineSnapshot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(offlineStorage.saveOfflineSnapshot).mockClear();
    vi.mocked(offlineStorage.getOfflineSnapshot).mockClear();
    vi.mocked(offlineStorage.deleteOfflineSnapshot).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns a clearOfflineSnapshot function", () => {
    const { result } = renderOffline();
    expect(typeof result.current.clearOfflineSnapshot).toBe("function");
  });

  test("does not save anything while staying connected", () => {
    renderOffline({ initialConnection: "connected" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 1000); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).not.toHaveBeenCalled();
  });

  test("connected -> disconnected does not save until the grace period elapses", () => {
    const { rerender } = renderOffline({ initialConnection: "connected" });
    rerender({ connection: "disconnected" });
    // Before grace period: no save.
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS - 1000); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).not.toHaveBeenCalled();
    // After grace period: save fires once.
    act(() => { vi.advanceTimersByTime(2000); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot).mock.calls[0][0]).toMatchObject({
      diagramId: "diag-1",
      userId: "user-1",
    });
  });

  test("connection 'error' also triggers the offline grace period save", () => {
    const { rerender } = renderOffline({ initialConnection: "connected" });
    rerender({ connection: "error" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).toHaveBeenCalledTimes(1);
  });

  test("reconnecting before grace period cancels the pending save", () => {
    const { rerender } = renderOffline({ initialConnection: "connected" });
    rerender({ connection: "disconnected" });
    // Reconnect halfway through the grace window.
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS / 2); });
    rerender({ connection: "connected" });
    // Advance past where the save would have fired — it must not.
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).not.toHaveBeenCalled();
  });

  test("onOfflineSave callback is invoked once the snapshot completes", async () => {
    const onOfflineSave = vi.fn();
    const { rerender } = renderOffline({ initialConnection: "connected", onOfflineSave });
    rerender({ connection: "disconnected" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    // Flush the awaited saveOfflineSnapshot promise.
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    expect(onOfflineSave).toHaveBeenCalledTimes(1);
  });

  test("after an offline save, reconnecting fires onConflict when a snapshot exists", async () => {
    const onConflict = vi.fn();
    const snapshot = {
      diagramId: "diag-1",
      userId: "user-1",
      userName: "Adrian",
      elements: [{ id: "e1" }],
      appState: {},
      savedAt: "2026-06-24T00:00:00Z",
    };
    vi.mocked(offlineStorage.getOfflineSnapshot).mockResolvedValueOnce(snapshot);
    const { rerender } = renderOffline({ initialConnection: "connected", onConflict });
    // 1) go offline + wait grace -> snapshot saved + hasOfflineEdits=true
    rerender({ connection: "disconnected" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    // 2) reconnect -> reads snapshot from storage, calls onConflict
    rerender({ connection: "connected" });
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    expect(vi.mocked(offlineStorage.getOfflineSnapshot)).toHaveBeenCalledWith("diag-1");
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(onConflict.mock.calls[0][0]).toEqual(snapshot);
  });

  test("reconnect without prior offline edits does NOT call onConflict", async () => {
    const onConflict = vi.fn();
    const { rerender } = renderOffline({ initialConnection: "connected", onConflict });
    // Brief disconnect that does not exceed the grace window — no offline save happens.
    rerender({ connection: "disconnected" });
    act(() => { vi.advanceTimersByTime(1000); });
    rerender({ connection: "connected" });
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    expect(onConflict).not.toHaveBeenCalled();
    expect(vi.mocked(offlineStorage.getOfflineSnapshot)).not.toHaveBeenCalled();
  });

  test("offline save is a no-op when excalidraw api is not ready", async () => {
    const { rerender } = renderOffline({ initialConnection: "connected", api: null });
    rerender({ connection: "disconnected" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).not.toHaveBeenCalled();
  });

  test("offline save is a no-op when selfUserId is null", async () => {
    const { rerender } = renderOffline({ initialConnection: "connected", selfUserId: null });
    rerender({ connection: "disconnected" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).not.toHaveBeenCalled();
  });

  test("uses 'Unknown' as userName when selfUserName is not provided", async () => {
    const { rerender } = renderOffline({ initialConnection: "connected" });
    rerender({ connection: "disconnected" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot).mock.calls[0][0].userName).toBe("Unknown");
  });

  test("uses selfUserName when provided", async () => {
    const { rerender } = renderOffline({ initialConnection: "connected", selfUserName: "Adrian" });
    rerender({ connection: "disconnected" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    for (let i = 0; i < 3; i++) await act(async () => { await Promise.resolve(); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot).mock.calls[0][0].userName).toBe("Adrian");
  });

  test("toggling disconnect twice in a row does not double-schedule (idempotent)", () => {
    const { rerender } = renderOffline({ initialConnection: "connected" });
    rerender({ connection: "disconnected" });
    rerender({ connection: "error" });
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 100); });
    // Even though we transitioned through two offline states, only one save fires
    // because the second transition (disconnected->error) does not satisfy wasConnected.
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).toHaveBeenCalledTimes(1);
  });

  test("clearOfflineSnapshot delegates to deleteOfflineSnapshot", async () => {
    const { result } = renderOffline();
    await act(async () => { await result.current.clearOfflineSnapshot(); });
    expect(vi.mocked(offlineStorage.deleteOfflineSnapshot)).toHaveBeenCalledWith("diag-1");
  });

  test("unmount cancels a pending offline save timer", () => {
    const { rerender, unmount } = renderOffline({ initialConnection: "connected" });
    rerender({ connection: "disconnected" });
    unmount();
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 1000); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).not.toHaveBeenCalled();
  });

  test("beforeunload while offline-long-enough triggers a synchronous save attempt", () => {
    const { rerender } = renderOffline({ initialConnection: "connected" });
    rerender({ connection: "disconnected" });
    // Cross the grace window so disconnectedAt is old enough.
    act(() => { vi.advanceTimersByTime(OFFLINE_GRACE_MS + 1000); });
    // The grace-window setTimeout already fired one save; clear and re-arm.
    vi.mocked(offlineStorage.saveOfflineSnapshot).mockClear();
    act(() => { window.dispatchEvent(new Event("beforeunload")); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).toHaveBeenCalledTimes(1);
  });

  test("beforeunload while connected does NOT save anything", () => {
    renderOffline({ initialConnection: "connected" });
    act(() => { window.dispatchEvent(new Event("beforeunload")); });
    expect(vi.mocked(offlineStorage.saveOfflineSnapshot)).not.toHaveBeenCalled();
  });
});
