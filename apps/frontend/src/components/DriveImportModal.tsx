import { useEffect, useState } from "react";
import { driveApi, type DriveFileItem } from "@/api/drive";

const API_URL = import.meta.env.VITE_API_URL ?? "";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (diagramId: string) => void;
};

export function DriveImportModal({ open, onClose, onImported }: Props) {
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>("");
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reset state on open
    setFiles([]);
    setError(null);
    setFolderStack([]);
    setCurrentFolderId("");
    setDriveConnected(null);
    checkStatusAndLoad();
  }, [open]);

  async function checkStatusAndLoad() {
    setLoading(true);
    try {
      const status = await driveApi.getStatus();
      setDriveConnected(status.connected);
      if (status.connected) {
        await loadFiles();
      }
    } catch {
      setDriveConnected(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles(folderId?: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await driveApi.listFiles(folderId);
      setFiles(result.files);
      setCurrentFolderId(result.currentFolderId);
    } catch {
      setError("Could not load Drive files.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  function openFolder(folder: DriveFileItem) {
    setFolderStack((prev) => [...prev, { id: currentFolderId, name: folderStack.length === 0 ? "Drawhaus Backups" : "" }]);
    loadFiles(folder.id);
  }

  function goBack() {
    const prev = folderStack[folderStack.length - 1];
    if (prev) {
      setFolderStack((s) => s.slice(0, -1));
      loadFiles(prev.id);
    }
  }

  async function importFile(file: DriveFileItem) {
    setImporting(file.id);
    setError(null);
    try {
      const result = await driveApi.importFile({ fileId: file.id, fileName: file.name });
      onImported(result.diagramId);
      onClose();
    } catch {
      setError(`Failed to import "${file.name}".`);
    } finally {
      setImporting(null);
    }
  }

  if (!open) return null;

  function formatSize(size?: string) {
    if (!size) return "";
    const bytes = Number.parseInt(size, 10);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  const excalidrawFiles = files.filter((f) => !f.isFolder && f.name.endsWith(".excalidraw"));
  const folders = files.filter((f) => f.isFolder);
  const sortedFiles = [...folders, ...excalidrawFiles];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface-raised shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.6 66.85L14.25 78h58.8l7.65-11.15z" fill="#2684FC" />
              <path d="M29.05 0L6.6 66.85l7.65 11.15 22.45-38.8z" fill="#0066DA" />
              <path d="M58.25 0H29.05l22.45 39.2H80.7z" fill="#FFBA00" />
            </svg>
            <h2 className="text-lg font-semibold text-text-primary">Import from Google Drive</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-muted transition hover:bg-surface hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Breadcrumb / back */}
        {driveConnected && folderStack.length > 0 && (
          <div className="border-b border-border px-6 py-2">
            <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm text-primary hover:underline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </button>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[400px] min-h-[200px] overflow-y-auto px-6 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-text-muted">Loading...</p>
          ) : driveConnected === false ? (
            /* Not connected — show connect CTA */
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg width="32" height="32" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.6 66.85L14.25 78h58.8l7.65-11.15z" fill="#2684FC" />
                  <path d="M29.05 0L6.6 66.85l7.65 11.15 22.45-38.8z" fill="#0066DA" />
                  <path d="M58.25 0H29.05l22.45 39.2H80.7z" fill="#FFBA00" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-text-primary">Google Drive not connected</p>
                <p className="mt-1 text-xs text-text-muted">Connect your Google Drive to import .excalidraw files.</p>
              </div>
              <a
                href={`${API_URL}/api/auth/google/drive`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                Connect Google Drive
              </a>
            </div>
          ) : sortedFiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-muted">No .excalidraw files found in this folder.</p>
          ) : (
            <div className="divide-y divide-border">
              {sortedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 py-3">
                  {file.isFolder ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-primary"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-muted"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
                    <p className="text-xs text-text-muted">
                      {formatDate(file.modifiedTime)}
                      {file.size && ` · ${formatSize(file.size)}`}
                    </p>
                  </div>
                  {file.isFolder ? (
                    <button
                      type="button"
                      onClick={() => openFolder(file)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => importFile(file)}
                      disabled={importing !== null}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
                    >
                      {importing === file.id ? "Importing..." : "Import"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3">
          <p className="text-xs text-text-muted">Only .excalidraw files can be imported as diagrams.</p>
        </div>
      </div>
    </div>
  );
}
