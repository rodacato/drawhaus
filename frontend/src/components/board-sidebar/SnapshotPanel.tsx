import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";
import { useSnapshots } from "@/lib/hooks/useSnapshots";
import type { SnapshotMeta, SnapshotFull } from "@/api/snapshots";
import type { ExcalidrawApi } from "@/lib/types";

type SnapshotPanelProps = {
  diagramId: string;
  canEdit: boolean;
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  onRestored?: () => void;
};

const TRIGGER_LABELS: Record<string, string> = {
  open: "Auto-save",
  close: "Auto-save",
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

function SessionBadge({ activeUsers }: { activeUsers: number }) {
  if (activeUsers <= 1) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-text-muted" title={`${activeUsers} users in session`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
      {activeUsers}
    </span>
  );
}

/* ─── Preview modal with actions ─── */
function SnapshotPreview({
  snapshot,
  canEdit,
  onClose,
  onRestore,
  onRename,
}: {
  snapshot: SnapshotFull;
  canEdit: boolean;
  onClose: () => void;
  onRestore: () => void;
  onRename: (name: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [naming, setNaming] = useState(false);
  const [nameValue, setNameValue] = useState(snapshot.name ?? "");
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const container = canvasRef.current;
      if (!container || !snapshot.elements.length) return;
      try {
        const { exportToCanvas } = await import("@excalidraw/excalidraw");
        const canvas = await exportToCanvas({
          elements: snapshot.elements as Parameters<typeof exportToCanvas>[0]["elements"],
          appState: { ...snapshot.appState, exportWithDarkMode: false } as Parameters<typeof exportToCanvas>[0]["appState"],
          files: null,
          maxWidthOrHeight: 600,
        });
        if (cancelled) return;
        container.innerHTML = "";
        canvas.style.maxWidth = "100%";
        canvas.style.height = "auto";
        canvas.style.borderRadius = "8px";
        container.appendChild(canvas);
      } catch { /* preview is best-effort */ }
    }
    render();
    return () => { cancelled = true; };
  }, [snapshot]);

  function handleNameSubmit() {
    const trimmed = nameValue.trim();
    if (trimmed) onRename(trimmed);
    setNaming(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`${ui.card} relative z-10 w-full max-w-xl space-y-3 shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className={ui.h2}>
            {snapshot.name ?? `${TRIGGER_LABELS[snapshot.trigger] ?? snapshot.trigger} — ${timeAgo(snapshot.createdAt)}`}
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface hover:text-text-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{snapshot.createdByName ?? "System"}</span>
          <span>·</span>
          <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
          {snapshot.activeUsers > 1 && (
            <>
              <span>·</span>
              <SessionBadge activeUsers={snapshot.activeUsers} />
            </>
          )}
        </div>

        {/* Canvas preview */}
        <div ref={canvasRef} className="flex min-h-[200px] items-center justify-center rounded-lg bg-white">
          <span className="text-xs text-text-muted">Rendering preview...</span>
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className={`${ui.btn} ${ui.btnPrimary} flex-1`}
              disabled={restoring}
              onClick={() => { setRestoring(true); onRestore(); }}
            >
              {restoring ? "Restoring..." : "Restore this version"}
            </button>
            {naming ? (
              <div className="flex flex-1 items-center gap-1">
                <input
                  className="w-full rounded border border-border bg-surface-raised px-2 py-1.5 text-sm outline-none focus:border-primary"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameSubmit();
                    if (e.key === "Escape") setNaming(false);
                  }}
                  autoFocus
                  placeholder="Version name..."
                />
                <button
                  type="button"
                  className={`${ui.btn} ${ui.btnSecondary} shrink-0`}
                  onClick={handleNameSubmit}
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${ui.btn} ${ui.btnSecondary} flex-1`}
                onClick={() => { setNameValue(snapshot.name ?? ""); setNaming(true); }}
              >
                {snapshot.name ? "Rename" : "Name this version"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ─── Single snapshot item ─── */
function SnapshotItem({
  snapshot,
  canEdit,
  onPreview,
  onRestore,
  onRename,
  onDelete,
}: {
  snapshot: SnapshotMeta;
  canEdit: boolean;
  onPreview: () => void;
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

  const authorLabel = snapshot.createdByName ?? "System";

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
          <button
            type="button"
            className="w-full text-left font-medium text-text-primary truncate hover:text-primary transition-colors"
            onClick={onPreview}
            title="Click to preview"
          >
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
          </button>
        )}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
          <span>{authorLabel}</span>
          <span>·</span>
          <span>{timeAgo(snapshot.createdAt)}</span>
          <SessionBadge activeUsers={snapshot.activeUsers} />
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
                  onClick={() => { setMenuOpen(false); onPreview(); }}
                >
                  Preview
                </button>
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

/* ─── Main panel ─── */
export function SnapshotPanel({ diagramId, canEdit, excalidrawApiRef, onRestored }: SnapshotPanelProps) {
  const { named, auto, loading, getSnapshot, createSnapshot, restoreSnapshot, renameSnapshot, deleteSnapshot, refresh } = useSnapshots(diagramId);
  const [creating, setCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<SnapshotMeta | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<SnapshotFull | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    try {
      await createSnapshot();
    } catch { /* ignore */ }
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

  const handlePreviewRestore = useCallback(async () => {
    if (!previewSnapshot) return;
    await handleRestore(previewSnapshot.id);
  }, [previewSnapshot, restoreSnapshot, excalidrawApiRef, onRestored]);

  const handlePreviewRename = useCallback(async (name: string) => {
    if (!previewSnapshot) return;
    await renameSnapshot(previewSnapshot.id, name);
    // Update preview in-place with new name
    setPreviewSnapshot((prev) => prev ? { ...prev, name } : null);
  }, [previewSnapshot, renameSnapshot]);

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

      {/* Preview modal — closes independently, drawer stays open */}
      {previewSnapshot && (
        <SnapshotPreview
          snapshot={previewSnapshot}
          canEdit={canEdit}
          onClose={() => setPreviewSnapshot(null)}
          onRestore={handlePreviewRestore}
          onRename={handlePreviewRename}
        />
      )}

      {/* Restore confirmation modal (from list context menu) */}
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
