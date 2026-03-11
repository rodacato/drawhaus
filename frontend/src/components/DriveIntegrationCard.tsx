import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { driveApi, type DriveStatus } from "@/api/drive";
import { ui } from "@/lib/ui";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function DriveIntegrationCard() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const driveParam = searchParams.get("drive");
    if (driveParam === "connected") {
      setMessage({ type: "success", text: "Google Drive connected successfully!" });
    } else if (driveParam === "error") {
      setMessage({ type: "error", text: "Failed to connect Google Drive. Please try again." });
    }
  }, [searchParams]);

  useEffect(() => {
    driveApi
      .getStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, autoBackupEnabled: false, scopes: "" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleBackup() {
    if (!status) return;
    setToggling(true);
    setMessage(null);
    try {
      const result = await driveApi.toggleBackup(!status.autoBackupEnabled);
      setStatus((s) => (s ? { ...s, autoBackupEnabled: result.enabled } : s));
    } catch {
      setMessage({ type: "error", text: "Failed to toggle auto-backup." });
    } finally {
      setToggling(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setMessage(null);
    try {
      await driveApi.disconnect();
      setStatus({ connected: false, autoBackupEnabled: false, scopes: "" });
      setMessage({ type: "success", text: "Google Drive disconnected." });
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect." });
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className={ui.card}>
        <p className={ui.muted}>Loading...</p>
      </div>
    );
  }

  return (
    <div className={ui.card}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.6 66.85L14.25 78h58.8l7.65-11.15z" fill="#2684FC" />
            <path d="M29.05 0L6.6 66.85l7.65 11.15 22.45-38.8z" fill="#0066DA" />
            <path d="M58.25 0H29.05l22.45 39.2H80.7z" fill="#FFBA00" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-text-primary">Google Drive</h3>
          <p className="text-xs text-text-secondary">
            {status?.connected ? "Connected — auto-backup your diagrams" : "Back up diagrams to your Google Drive"}
          </p>
        </div>
        {status?.connected && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Connected
          </span>
        )}
      </div>

      {message && (
        <p className={`mb-4 ${message.type === "error" ? ui.alertError : ui.alertSuccess}`}>{message.text}</p>
      )}

      {!status?.connected ? (
        <a
          href={`${API_URL}/api/auth/google/drive`}
          className={`${ui.btn} ${ui.btnPrimary} inline-flex items-center gap-2`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          Connect Google Drive
        </a>
      ) : (
        <div className="space-y-4">
          {/* Auto-backup toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Auto-backup</p>
              <p className="text-xs text-text-secondary">Automatically save diagrams to Drive on every change</p>
            </div>
            <button
              type="button"
              onClick={handleToggleBackup}
              disabled={toggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                status.autoBackupEnabled ? "bg-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  status.autoBackupEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {status.autoBackupEnabled && (
            <p className="text-xs text-text-secondary">
              Diagrams are saved to <span className="font-medium">Drawhaus Backups/</span> in your Google Drive.
            </p>
          )}

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className={`${ui.btn} text-sm text-text-secondary hover:text-danger`}
          >
            {disconnecting ? "Disconnecting..." : "Disconnect Google Drive"}
          </button>
        </div>
      )}
    </div>
  );
}
