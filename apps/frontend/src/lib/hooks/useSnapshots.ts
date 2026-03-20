import { useState, useCallback, useEffect } from "react";
import { snapshotsApi, type SnapshotMeta, type SnapshotFull } from "@/api/snapshots";

export function useSnapshots(diagramId: string | null) {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!diagramId) return;
    setLoading(true);
    try {
      const res = await snapshotsApi.list(diagramId);
      setSnapshots(res.snapshots);
    } catch {
      // ignore — user may not have access or endpoint may fail
    } finally {
      setLoading(false);
    }
  }, [diagramId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createSnapshot = useCallback(async (name?: string) => {
    if (!diagramId) return;
    await snapshotsApi.create(diagramId, name);
    await refresh();
  }, [diagramId, refresh]);

  const restoreSnapshot = useCallback(async (snapshotId: string): Promise<SnapshotFull | null> => {
    if (!diagramId) return null;
    // Fetch full snapshot data before restoring (so we can apply to canvas)
    const { snapshot } = await snapshotsApi.get(diagramId, snapshotId);
    await snapshotsApi.restore(diagramId, snapshotId);
    await refresh();
    return snapshot;
  }, [diagramId, refresh]);

  const renameSnapshot = useCallback(async (snapshotId: string, name: string | null) => {
    if (!diagramId) return;
    await snapshotsApi.rename(diagramId, snapshotId, name);
    await refresh();
  }, [diagramId, refresh]);

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    if (!diagramId) return;
    await snapshotsApi.delete(diagramId, snapshotId);
    await refresh();
  }, [diagramId, refresh]);

  const getSnapshot = useCallback(async (snapshotId: string): Promise<SnapshotFull | null> => {
    if (!diagramId) return null;
    const { snapshot } = await snapshotsApi.get(diagramId, snapshotId);
    return snapshot;
  }, [diagramId]);

  const named = snapshots.filter((s) => s.name !== null);
  const auto = snapshots.filter((s) => s.name === null);

  return {
    snapshots,
    named,
    auto,
    loading,
    refresh,
    createSnapshot,
    getSnapshot,
    restoreSnapshot,
    renameSnapshot,
    deleteSnapshot,
  };
}
