import { useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";
import type { OfflineSnapshot } from "@/lib/offline-storage";
import { snapshotsApi } from "@/api/snapshots";

type OfflineRecoveryDialogProps = {
  snapshot: OfflineSnapshot;
  onKeepMine: (elements: unknown[], appState: Record<string, unknown>) => void;
  onKeepServer: () => void;
  onSaveAsSnapshot: () => void;
  onClose: () => void;
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

export function OfflineRecoveryDialog({
  snapshot,
  onKeepMine,
  onKeepServer,
  onSaveAsSnapshot,
  onClose,
}: OfflineRecoveryDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleKeepMine() {
    setLoading(true);
    onKeepMine(snapshot.elements, snapshot.appState);
  }

  async function handleSaveAsSnapshot() {
    setLoading(true);
    try {
      await snapshotsApi.create(snapshot.diagramId, `Offline backup (${new Date(snapshot.savedAt).toLocaleString()})`);
    } catch { /* ignore */ }
    onSaveAsSnapshot();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={`${ui.card} relative z-10 w-full max-w-md space-y-4 shadow-2xl`}>
        <h2 className={ui.h2}>Offline Changes Detected</h2>
        <p className="text-sm text-text-secondary">
          You were disconnected and have local changes saved <strong>{timeAgo(snapshot.savedAt)}</strong>.
          The server may have been updated by other users while you were offline.
        </p>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            className={`${ui.btn} ${ui.btnPrimary} w-full`}
            onClick={handleKeepMine}
            disabled={loading}
          >
            Keep my offline version
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnSecondary} w-full`}
            onClick={() => { setLoading(true); onKeepServer(); }}
            disabled={loading}
          >
            Keep server version
          </button>
          <button
            type="button"
            className={`${ui.btn} ${ui.btnSecondary} w-full`}
            onClick={handleSaveAsSnapshot}
            disabled={loading}
          >
            Save my version as snapshot
          </button>
        </div>

        <p className="text-xs text-text-muted text-center">
          Choosing "Keep server version" will discard your offline changes.
        </p>
      </div>
    </div>,
    document.body,
  );
}
