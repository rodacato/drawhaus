import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSnapshots } from "../lib/hooks/useSnapshots";
import { snapshotsApi, type SnapshotMeta, type SnapshotFull } from "../api/snapshots";

function makeMeta(over: Partial<SnapshotMeta> = {}): SnapshotMeta {
  return {
    id: "s1",
    diagramId: "d1",
    createdBy: "u1",
    createdByName: "Ana",
    activeUsers: 1,
    trigger: "manual",
    name: null,
    createdAt: "2026-01-01",
    ...over,
  };
}

function makeFull(over: Partial<SnapshotFull> = {}): SnapshotFull {
  return { ...makeMeta(over), elements: [], appState: {}, ...over };
}

async function renderLoaded(diagramId: string | null, seed: SnapshotMeta[] = []) {
  vi.spyOn(snapshotsApi, "list").mockResolvedValue({ snapshots: seed } as never);
  const view = renderHook(() => useSnapshots(diagramId));
  if (diagramId) await waitFor(() => expect(view.result.current.snapshots).toEqual(seed));
  return view;
}

describe("useSnapshots", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("loads snapshots on mount when a diagramId is set", async () => {
    const listSpy = vi.spyOn(snapshotsApi, "list").mockResolvedValue({ snapshots: [makeMeta()] } as never);
    const { result } = renderHook(() => useSnapshots("d1"));

    await waitFor(() => expect(result.current.snapshots).toHaveLength(1));
    expect(listSpy).toHaveBeenCalledWith("d1");
  });

  test("does not call the API when diagramId is null", async () => {
    const listSpy = vi.spyOn(snapshotsApi, "list");
    const { result } = renderHook(() => useSnapshots(null));

    await act(async () => { await result.current.refresh(); });
    expect(listSpy).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  test("refresh is silent on API error", async () => {
    vi.spyOn(snapshotsApi, "list").mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useSnapshots("d1"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.snapshots).toEqual([]);
  });

  test("splits snapshots into named and auto buckets", async () => {
    const { result } = await renderLoaded("d1", [
      makeMeta({ id: "a", name: "release" }),
      makeMeta({ id: "b", name: null }),
      makeMeta({ id: "c", name: "milestone" }),
    ]);

    expect(result.current.named.map((s) => s.id)).toEqual(["a", "c"]);
    expect(result.current.auto.map((s) => s.id)).toEqual(["b"]);
  });

  test("createSnapshot creates then refreshes", async () => {
    const createSpy = vi.spyOn(snapshotsApi, "create").mockResolvedValue({ snapshot: makeMeta() } as never);
    const listSpy = vi.spyOn(snapshotsApi, "list").mockResolvedValue({ snapshots: [] } as never);
    const { result } = renderHook(() => useSnapshots("d1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    listSpy.mockClear();

    await act(async () => { await result.current.createSnapshot("tag"); });
    expect(createSpy).toHaveBeenCalledWith("d1", "tag");
    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  test("createSnapshot is a no-op without a diagramId", async () => {
    const createSpy = vi.spyOn(snapshotsApi, "create");
    const { result } = await renderLoaded(null);

    await act(async () => { await result.current.createSnapshot("tag"); });
    expect(createSpy).not.toHaveBeenCalled();
  });

  test("restoreSnapshot fetches the full snapshot, restores, refreshes and returns it", async () => {
    const full = makeFull({ id: "s9", elements: [{ x: 1 }] });
    const getSpy = vi.spyOn(snapshotsApi, "get").mockResolvedValue({ snapshot: full } as never);
    const restoreSpy = vi.spyOn(snapshotsApi, "restore").mockResolvedValue({ success: true, diagramId: "d1" } as never);
    const { result } = await renderLoaded("d1");

    let returned: SnapshotFull | null = null;
    await act(async () => { returned = await result.current.restoreSnapshot("s9"); });

    expect(getSpy).toHaveBeenCalledWith("d1", "s9");
    expect(restoreSpy).toHaveBeenCalledWith("d1", "s9");
    expect(returned).toEqual(full);
  });

  test("restoreSnapshot returns null without a diagramId", async () => {
    const restoreSpy = vi.spyOn(snapshotsApi, "restore");
    const { result } = await renderLoaded(null);

    let returned: SnapshotFull | null = makeFull();
    await act(async () => { returned = await result.current.restoreSnapshot("s9"); });
    expect(returned).toBeNull();
    expect(restoreSpy).not.toHaveBeenCalled();
  });

  test("renameSnapshot renames then refreshes", async () => {
    const renameSpy = vi.spyOn(snapshotsApi, "rename").mockResolvedValue({ snapshot: makeMeta() } as never);
    const { result } = await renderLoaded("d1");

    await act(async () => { await result.current.renameSnapshot("s1", "v2"); });
    expect(renameSpy).toHaveBeenCalledWith("d1", "s1", "v2");
  });

  test("deleteSnapshot deletes then refreshes", async () => {
    const deleteSpy = vi.spyOn(snapshotsApi, "delete").mockResolvedValue({} as never);
    const { result } = await renderLoaded("d1");

    await act(async () => { await result.current.deleteSnapshot("s1"); });
    expect(deleteSpy).toHaveBeenCalledWith("d1", "s1");
  });

  test("getSnapshot returns the full snapshot, or null without a diagramId", async () => {
    const full = makeFull({ id: "s5" });
    vi.spyOn(snapshotsApi, "get").mockResolvedValue({ snapshot: full } as never);

    const withId = await renderLoaded("d1");
    let returned: SnapshotFull | null = null;
    await act(async () => { returned = await withId.result.current.getSnapshot("s5"); });
    expect(returned).toEqual(full);

    const withoutId = renderHook(() => useSnapshots(null));
    let none: SnapshotFull | null = full;
    await act(async () => { none = await withoutId.result.current.getSnapshot("s5"); });
    expect(none).toBeNull();
  });
});
