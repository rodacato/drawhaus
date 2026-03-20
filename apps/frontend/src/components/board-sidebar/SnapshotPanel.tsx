import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Socket } from "socket.io-client";
import { ui } from "@/lib/ui";
import { useSnapshots } from "@/lib/hooks/useSnapshots";
import type { SnapshotMeta, SnapshotFull } from "@/api/snapshots";
import type { ExcalidrawApi } from "@/lib/types";
import { timeAgo } from "./snapshot-helpers";
import { SnapshotPreview } from "./SnapshotPreview";
import { SnapshotItem } from "./SnapshotItem";

type SnapshotPanelProps = {
  diagramId: string;
  canEdit: boolean;
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  onRestored?: () => void;
  socketRef?: React.RefObject<Socket | null>;
};

export function SnapshotPanel({ diagramId, canEdit, excalidrawApiRef, onRestored, socketRef }: SnapshotPanelProps) {
  const { named, auto, loading, getSnapshot, createSnapshot, restoreSnapshot, renameSnapshot, deleteSnapshot, refresh } = useSnapshots(diagramId);

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
    try { await createSnapshot(); } catch { /* ignore */ }
    setCreating(false);
  }

  async function handleRestore(snapshotId: string) {
    try {
      const snapshot = await restoreSnapshot(snapshotId);
      if (snapshot && excalidrawApiRef.current) {
        excalidrawApiRef.current.updateScene({ elements: snapshot.elements });
      }
      setPreviewSnapshot(null);
      onRestored?.();
    } catch { /* ignore */ }
  }

  async function handleRestoreFromConfirm() {
    if (!confirmRestore) return;
    setRestoring(true);
    await handleRestore(confirmRestore.id);
    setRestoring(false);
    setConfirmRestore(null);
  }

  const handlePreview = useCallback(async (snapshotId: string) => {
    setLoadingPreview(snapshotId);
    try {
      const full = await getSnapshot(snapshotId);
      if (full) setPreviewSnapshot(full);
    } catch { /* ignore */ }
    setLoadingPreview(null);
  }, [getSnapshot]);

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
        excalidrawApiRef.current.updateScene({ elements: full.elements });
      }
      setPreviewSnapshot(null);
      onRestored?.();
    } catch { /* ignore */ }
  }, [excalidrawApiRef, onRestored]);

  const handlePreviewRename = useCallback(async (name: string) => {
    const snap = previewSnapshotRef.current;
    if (!snap) return;
    await renameSnapshot(snap.id, name);
    setPreviewSnapshot((prev) => prev ? { ...prev, name } : null);
  }, [renameSnapshot]);

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
            onRename={(name) => renameSnapshot(s.id, name)}
            onDelete={() => deleteSnapshot(s.id)}
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
          className="rounded-lg p-1.5 text-text-muted transition hover:bg-surface hover:text-text-primary"
          onClick={() => refresh()}
          title="Refresh"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {loading && named.length === 0 && auto.length === 0 && (
        <p className="text-xs text-text-muted text-center py-4">Loading...</p>
      )}

      {!loading && named.length === 0 && auto.length === 0 && (
        <p className="text-xs text-text-muted text-center py-4">No snapshots yet. They are created automatically when you close or edit a diagram.</p>
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
      {confirmRestore && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !restoring && setConfirmRestore(null)} />
          <div className={`${ui.card} relative z-10 w-full max-w-sm space-y-4 shadow-2xl`}>
            <h2 className={ui.h2}>Restore Version</h2>
            <p className="text-sm text-text-secondary">
              This will replace the current diagram content with the version from{" "}
              <strong>{confirmRestore.name ?? timeAgo(confirmRestore.createdAt)}</strong>
              {confirmRestore.createdByName && (
                <> by <strong>{confirmRestore.createdByName}</strong></>
              )}.
              A backup of the current state will be saved automatically.
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
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
