import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";
import { diagramsApi } from "@/api/diagrams";
import type { SnapshotFull } from "@/api/snapshots";
import { TRIGGER_LABELS, timeAgo, SessionBadge } from "./snapshot-helpers";

export function SnapshotPreview({
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
  const [creatingDiagram, setCreatingDiagram] = useState(false);

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

        {/* Open as new diagram */}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-text-secondary transition hover:border-primary hover:text-primary"
          disabled={creatingDiagram}
          onClick={async () => {
            setCreatingDiagram(true);
            try {
              const title = snapshot.name
                ? `${snapshot.name} (copy)`
                : `Snapshot ${new Date(snapshot.createdAt).toLocaleDateString()} (copy)`;
              const res = await diagramsApi.create({ title, elements: snapshot.elements }) as { id: string };
              window.open(`/board/${res.id}`, "_blank");
            } catch { /* ignore */ }
            setCreatingDiagram(false);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {creatingDiagram ? "Creating..." : "Open as new diagram"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
