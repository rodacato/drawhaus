import { useState } from "react";
import type { SnapshotMeta } from "@/api/snapshots";
import { TRIGGER_LABELS, timeAgo, SessionBadge } from "./snapshot-helpers";

export function SnapshotItem({
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
