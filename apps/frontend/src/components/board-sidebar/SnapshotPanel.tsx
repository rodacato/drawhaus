import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog } from "@/components/Dialog";
import type { Socket } from "socket.io-client";
import { ui } from "@/lib/ui";
import { LoadError } from "@/components/LoadError";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";
import { useSnapshots } from "@/lib/hooks/useSnapshots";
import type { SnapshotMeta, SnapshotFull } from "@/api/snapshots";
import { applyRemoteScene, type ExcalidrawApi } from "@/lib/excalidraw";
import { timeAgo } from "./snapshot-helpers";
import { SnapshotPreview } from "./SnapshotPreview";
import { SnapshotItem } from "./SnapshotItem";

// Lazy normaliser — ensures snapshot elements have all Excalidraw-internal
// fields so updateScene renders them correctly.
let _restoreElements: ((elements: unknown[], localElements: null) => unknown[]) | null = null;
async function normalizeElements(elements: unknown[]): Promise<unknown[]> {
  if (!_restoreElements) {
    const mod = await import("@excalidraw/excalidraw");
    _restoreElements = (mod as unknown as { restoreElements: typeof _restoreElements })
      .restoreElements!;
  }
  return _restoreElements ? _restoreElements(elements, null) : elements;
}

type SnapshotPanelProps = {
  readonly diagramId: string;
  readonly canEdit: boolean;
  readonly excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  readonly onRestored?: () => void;
  readonly socketRef?: React.RefObject<Socket | null>;
};

export function SnapshotPanel({
  diagramId,
  canEdit,
  excalidrawApiRef,
  onRestored,
  socketRef,
}: SnapshotPanelProps) {
  const {
    named,
    auto,
    loading,
    loadError,
    getSnapshot,
    createSnapshot,
    restoreSnapshot,
    renameSnapshot,
    deleteSnapshot,
    refresh,
  } = useSnapshots(diagramId);

  const toast = useToast();
  const confirm = useConfirm();

  // Auto-refresh when other users create snapshots
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;
    let debounceTimer: ReturnType<typeof setTimeout>;
    function handleSnapshotCreated(data: { diagramId: string }) {
      if (data.diagramId !== diagramId) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refresh(), 300);
    }
    socket.on("snapshot-created", handleSnapshotCreated);
    return () => {
      socket.off("snapshot-created", handleSnapshotCreated);
      clearTimeout(debounceTimer);
    };
  }, [socketRef, diagramId, refresh]);

  const [creating, setCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<SnapshotMeta | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<SnapshotFull | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    try {
      await createSnapshot();
      toast("Version created", "success");
    } catch {
      toast("Could not create the version.", "error");
    }
    setCreating(false);
  }

  async function handleRestore(snapshotId: string): Promise<boolean> {
    try {
      const snapshot = await restoreSnapshot(snapshotId);
      if (snapshot && excalidrawApiRef.current) {
        const normalized = await normalizeElements(snapshot.elements);
        applyRemoteScene(excalidrawApiRef.current, { elements: normalized });
      }
      setPreviewSnapshot(null);
      onRestored?.();
      return true;
    } catch {
      toast("Could not restore that version.", "error");
      return false;
    }
  }

  async function handleRestoreFromConfirm() {
    if (!confirmRestore) return;
    setRestoring(true);
    const restored = await handleRestore(confirmRestore.id);
    setRestoring(false);
    if (restored) setConfirmRestore(null);
  }

  async function handleRename(snapshotId: string, name: string | null) {
    try {
      await renameSnapshot(snapshotId, name);
    } catch {
      toast("Could not rename the version.", "error");
    }
  }

  async function handleDelete(snapshot: SnapshotMeta) {
    const label = snapshot.name ?? timeAgo(snapshot.createdAt);
    const ok = await confirm({
      title: "Delete version",
      message: `Delete “${label}”? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteSnapshot(snapshot.id);
    } catch {
      toast("Could not delete the version.", "error");
    }
  }

  const handlePreview = useCallback(
    async (snapshotId: string) => {
      setLoadingPreview(snapshotId);
      try {
        const full = await getSnapshot(snapshotId);
        if (full) setPreviewSnapshot(full);
      } catch {
        toast("Could not load the preview.", "error");
      }
      setLoadingPreview(null);
    },
    [getSnapshot, toast],
  );

  // Use refs to avoid stale closures in preview callbacks
  const previewSnapshotRef = useRef(previewSnapshot);
  previewSnapshotRef.current = previewSnapshot;
  const restoreSnapshotRef = useRef(restoreSnapshot);
  restoreSnapshotRef.current = restoreSnapshot;

  const handlePreviewRestore = useCallback(async () => {
    const snap = previewSnapshotRef.current;
    if (!snap) return;
    try {
      const full = await restoreSnapshotRef.current(snap.id);
      if (full && excalidrawApiRef.current) {
        const normalized = await normalizeElements(full.elements);
        applyRemoteScene(excalidrawApiRef.current, { elements: normalized });
      }
      setPreviewSnapshot(null);
      onRestored?.();
    } catch {
      toast("Could not restore that version.", "error");
    }
  }, [excalidrawApiRef, onRestored, toast]);

  const handlePreviewRename = useCallback(
    async (name: string) => {
      const snap = previewSnapshotRef.current;
      if (!snap) return;
      try {
        await renameSnapshot(snap.id, name);
        setPreviewSnapshot((prev) => (prev ? { ...prev, name } : null));
      } catch {
        toast("Could not rename the version.", "error");
      }
    },
    [renameSnapshot, toast],
  );

  function renderList(items: SnapshotMeta[], label: string) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
        {items.map((s) => (
          <SnapshotItem
            key={s.id}
            snapshot={s}
            canEdit={canEdit}
            onPreview={() => handlePreview(s.id)}
            onRestore={() => setConfirmRestore(s)}
            onRename={(name) => handleRename(s.id, name)}
            onDelete={() => handleDelete(s)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={ui.h2}>Version History</h3>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition hover:bg-surface hover:text-text-primary"
          onClick={() => refresh()}
          title="Refresh"
          aria-label="Refresh versions"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
      </div>

      {canEdit && (
        <button
          type="button"
          className={`${ui.btn} ${ui.btnSecondary} w-full`}
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "Creating..." : "Create Version"}
        </button>
      )}

      {loadError && <LoadError message="Could not load the versions." onRetry={refresh} />}

      {loading && named.length === 0 && auto.length === 0 && (
        <p className="text-xs text-text-muted text-center py-4">Loading...</p>
      )}

      {!loading && !loadError && named.length === 0 && auto.length === 0 && (
        <p className="text-xs text-text-muted text-center py-4">
          No snapshots yet. They are created automatically when you close or edit a diagram.
        </p>
      )}

      {loadingPreview && (
        <p className="text-xs text-text-muted text-center py-1">Loading preview...</p>
      )}

      {renderList(named, "Named Versions")}
      {renderList(auto, "Automatic Snapshots")}

      {/* Preview modal */}
      {previewSnapshot && (
        <SnapshotPreview
          snapshot={previewSnapshot}
          canEdit={canEdit}
          onClose={() => setPreviewSnapshot(null)}
          onRestore={handlePreviewRestore}
          onRename={handlePreviewRename}
        />
      )}

      {/* Restore confirmation modal */}
      {confirmRestore && (
        <Dialog
          label="Restore Version"
          onClose={() => setConfirmRestore(null)}
          dismissible={!restoring}
          className={`${ui.card} max-w-sm space-y-4 shadow-2xl`}
        >
          <>
            <h2 className={ui.h2}>Restore Version</h2>
            <p className="text-sm text-text-secondary">
              This will replace the current diagram content with the version from{" "}
              <strong>{confirmRestore.name ?? timeAgo(confirmRestore.createdAt)}</strong>
              {confirmRestore.createdByName && (
                <>
                  {" "}
                  by <strong>{confirmRestore.createdByName}</strong>
                </>
              )}
              . A backup of the current state will be saved automatically.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestore(null)}
                disabled={restoring}
                className={`${ui.btn} ${ui.btnSecondary}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={restoring}
                className={`${ui.btn} ${ui.btnPrimary}`}
                onClick={handleRestoreFromConfirm}
              >
                {restoring ? "Restoring..." : "Restore"}
              </button>
            </div>
          </>
        </Dialog>
      )}
    </div>
  );
}
