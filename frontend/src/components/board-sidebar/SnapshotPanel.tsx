import { useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";
import { useSnapshots } from "@/lib/hooks/useSnapshots";
import type { SnapshotMeta } from "@/api/snapshots";
import type { ExcalidrawApi } from "@/lib/types";

type SnapshotPanelProps = {
  diagramId: string;
  canEdit: boolean;
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  onRestored?: () => void;
};

const TRIGGER_LABELS: Record<string, string> = {
  open: "Opened",
  close: "Closed",
  interval: "Auto-save",
  manual: "Manual",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SnapshotItem({
  snapshot,
  canEdit,
  onRestore,
  onRename,
  onDelete,
}: {
  snapshot: SnapshotMeta;
  canEdit: boolean;
  onRestore: () => void;
  onRename: (name: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(snapshot.name ?? "");
  const [menuOpen, setMenuOpen] = useState(false);

  function handleRenameSubmit() {
    const trimmed = nameValue.trim();
    onRename(trimmed || null);
    setEditing(false);
  }

  return (
    <div className="group flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            className="w-full rounded border border-border bg-surface-raised px-1.5 py-0.5 text-sm outline-none focus:border-primary"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            placeholder="Version name..."
          />
        ) : (
          <div className="font-medium text-text-primary truncate">
            {snapshot.name ? (
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-primary">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {snapshot.name}
              </span>
            ) : (
              <span className="text-text-secondary">{TRIGGER_LABELS[snapshot.trigger] ?? snapshot.trigger}</span>
            )}
          </div>
        )}
        <div className="mt-0.5 text-xs text-text-muted">
          {timeAgo(snapshot.createdAt)}
        </div>
      </div>
      {canEdit && !editing && (
        <div className="relative shrink-0">
          <button
            type="button"
            className="rounded p-1 text-text-muted opacity-0 transition hover:bg-surface-raised hover:text-text-primary group-hover:opacity-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-border bg-surface-raised py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface"
                  onClick={() => { setMenuOpen(false); onRestore(); }}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-surface"
                  onClick={() => { setMenuOpen(false); setEditing(true); setNameValue(snapshot.name ?? ""); }}
                >
                  {snapshot.name ? "Rename" : "Name this version"}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger hover:bg-surface"
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function SnapshotPanel({ diagramId, canEdit, excalidrawApiRef, onRestored }: SnapshotPanelProps) {
  const { named, auto, loading, createSnapshot, restoreSnapshot, renameSnapshot, deleteSnapshot, refresh } = useSnapshots(diagramId);
  const [creating, setCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<SnapshotMeta | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      await createSnapshot();
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function handleRestore() {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      const snapshot = await restoreSnapshot(confirmRestore.id);
      // Apply restored data to the canvas
      if (snapshot && excalidrawApiRef.current) {
        excalidrawApiRef.current.updateScene({ elements: snapshot.elements });
      }
      onRestored?.();
    } catch { /* ignore */ }
    setRestoring(false);
    setConfirmRestore(null);
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
        <p className="text-xs text-text-muted text-center py-4">No snapshots yet. They are created automatically when you open, close, or edit a diagram.</p>
      )}

      {named.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Named Versions</p>
          {named.map((s) => (
            <SnapshotItem
              key={s.id}
              snapshot={s}
              canEdit={canEdit}
              onRestore={() => setConfirmRestore(s)}
              onRename={(name) => renameSnapshot(s.id, name)}
              onDelete={() => deleteSnapshot(s.id)}
            />
          ))}
        </div>
      )}

      {auto.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Automatic Snapshots</p>
          {auto.map((s) => (
            <SnapshotItem
              key={s.id}
              snapshot={s}
              canEdit={canEdit}
              onRestore={() => setConfirmRestore(s)}
              onRename={(name) => renameSnapshot(s.id, name)}
              onDelete={() => deleteSnapshot(s.id)}
            />
          ))}
        </div>
      )}

      {/* Restore confirmation modal */}
      {confirmRestore && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !restoring && setConfirmRestore(null)} />
          <div className={`${ui.card} relative z-10 w-full max-w-sm space-y-4 shadow-2xl`}>
            <h2 className={ui.h2}>Restore Version</h2>
            <p className="text-sm text-text-secondary">
              This will replace the current diagram content with the version from{" "}
              <strong>{confirmRestore.name ?? timeAgo(confirmRestore.createdAt)}</strong>.
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
                onClick={handleRestore}
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
