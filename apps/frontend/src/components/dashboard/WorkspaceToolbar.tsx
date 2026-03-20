type WorkspaceToolbarProps = {
  viewMode: "grid" | "list";
  actionPending: boolean;
  creatingFolder: boolean;
  newFolderName: string;
  onCreateDiagram: () => void;
  onStartCreatingFolder: () => void;
  onCancelCreatingFolder: () => void;
  onNewFolderNameChange: (name: string) => void;
  onCreateFolder: () => void;
  onImport: () => void;
  onDriveImport: () => void;
  onViewModeChange: (mode: "grid" | "list") => void;
};

export function WorkspaceToolbar({ viewMode, actionPending, creatingFolder, newFolderName, onCreateDiagram, onStartCreatingFolder, onCancelCreatingFolder, onNewFolderNameChange, onCreateFolder, onImport, onDriveImport, onViewModeChange }: WorkspaceToolbarProps) {
  return (
    <div className="mb-8 flex items-center gap-2 border-b border-border pb-4">
      <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm shadow-primary/20 transition hover:bg-primary-hover" onClick={onCreateDiagram} disabled={actionPending} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        <span>{actionPending ? "Creating..." : "New Diagram"}</span>
      </button>
      {!creatingFolder ? (
        <button
          onClick={onStartCreatingFolder}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-raised"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg>
          <span>New Folder</span>
        </button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); onCreateFolder(); }} className="flex items-center">
          <input className="rounded-xl border border-primary bg-surface px-4 py-2 text-sm outline-none" placeholder="Folder name" value={newFolderName} onChange={(e) => onNewFolderNameChange(e.target.value)} autoFocus onBlur={() => { if (!newFolderName.trim()) onCancelCreatingFolder(); }} />
        </form>
      )}
      <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-raised" onClick={onImport} disabled={actionPending} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
        <span>Import</span>
      </button>
      <button className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-raised" onClick={onDriveImport} disabled={actionPending} type="button">
        <svg width="16" height="16" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.6 66.85L14.25 78h58.8l7.65-11.15z" fill="#2684FC" />
          <path d="M29.05 0L6.6 66.85l7.65 11.15 22.45-38.8z" fill="#0066DA" />
          <path d="M58.25 0H29.05l22.45 39.2H80.7z" fill="#FFBA00" />
        </svg>
        <span>Drive</span>
      </button>

      <div className="ml-auto flex items-center gap-0 rounded-lg border border-border bg-surface-raised p-1">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`rounded p-1.5 transition ${viewMode === "grid" ? "bg-surface text-primary" : "text-text-muted hover:text-text-secondary"}`}
          title="Grid view"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`rounded p-1.5 transition ${viewMode === "list" ? "bg-surface text-primary" : "text-text-muted hover:text-text-secondary"}`}
          title="List view"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
        </button>
      </div>
    </div>
  );
}
