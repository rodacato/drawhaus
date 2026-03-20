import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareModal } from "@/components/ShareModal";
import { DriveImportModal } from "@/components/DriveImportModal";
import { TemplatePicker } from "@/components/TemplatePicker";
import { Drawer } from "@/components/Drawer";
import { WorkspaceSettingsContent } from "@/components/WorkspaceSettingsContent";
import { DashboardSidebar, WorkspaceToolbar, WorkspaceView, GeneralView, TemplatesView } from "@/components/dashboard";
import { workspacesApi } from "@/api/workspaces";
import { useDashboardData, type SidebarView } from "@/lib/hooks/useDashboardData";
import { useDiagramActions } from "@/lib/hooks/useDiagramActions";
import { useTagActions } from "@/lib/hooks/useTagActions";

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">(() => (localStorage.getItem("drawhaus_view") as "grid" | "list") ?? "grid");
  const [sidebarView, setSidebarView] = useState<SidebarView>("recent");
  const [shareModalDiagramId, setShareModalDiagramId] = useState<string | null>(null);
  const [driveImportOpen, setDriveImportOpen] = useState(false);
  const [settingsWorkspaceId, setSettingsWorkspaceId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState(searchParams.get("q") ?? "");

  const folderIdParam = searchParams.get("folderId");
  const searchQuery = searchParams.get("q") ?? "";
  const folderId = folderIdParam === null ? undefined : folderIdParam === "null" ? null : folderIdParam;

  // ── Data ──
  const data = useDashboardData({ sidebarView, folderId, searchQuery });

  // ── Actions ──
  const actions = useDiagramActions({
    navigate, toast, confirm, loadData: data.loadData,
    setDiagrams: data.setDiagrams, diagrams: data.diagrams,
    folderId, activeWorkspaceId: data.activeWorkspaceId,
  });

  const tags = useTagActions({ setDiagrams: data.setDiagrams, setAllTags: data.setAllTags });

  // ── Sync sidebar view from search params ──
  useEffect(() => {
    if (searchQuery) return;
    if (folderIdParam === null) {
      if (sidebarView !== "recent" && sidebarView !== "starred") setSidebarView("all");
    }
    else if (folderIdParam === "null") setSidebarView("unfiled");
    else setSidebarView("folder");
  }, [folderIdParam, searchQuery]);

  useEffect(() => { localStorage.setItem("drawhaus_view", viewMode); }, [viewMode]);

  // ── Navigation helpers ──
  function navTo(fId?: string | null) {
    if (fId === undefined) { setSearchParams({}); setSidebarView("all"); }
    else if (fId === null) { setSearchParams({ folderId: "null" }); setSidebarView("unfiled"); }
    else { setSearchParams({ folderId: fId }); setSidebarView("folder"); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (sidebarSearch.trim()) setSearchParams({ q: sidebarSearch.trim() });
    else setSearchParams({});
  }

  // ── Combined diagram action props ──
  const diagramActions = {
    ...actions.diagramActions,
    onShare: (id: string) => setShareModalDiagramId(id),
    onToggleTag: tags.toggleTag,
    onCreateTag: tags.createTag,
    onDeleteTag: tags.deleteTag,
  };

  if (data.loading) {
    return <div className="flex h-screen items-center justify-center bg-surface text-sm text-text-muted">Loading...</div>;
  }

  const emptyMessage = searchQuery
    ? "No diagrams match your search."
    : data.isStarred ? "No starred diagrams yet. Star a diagram to see it here."
    : data.isRecent ? "No recent diagrams."
    : "No diagrams here yet. Create your first one.";

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <DashboardSidebar
        user={user}
        workspaces={data.workspaces}
        activeWorkspaceId={data.activeWorkspaceId}
        isRecent={data.isRecent}
        isStarred={data.isStarred}
        isTemplates={data.isTemplates}
        onNavRecent={() => { setSearchParams({}); setSidebarView("recent"); }}
        onNavStarred={() => { setSearchParams({}); setSidebarView("starred"); }}
        onNavTemplates={() => { setSearchParams({}); setSidebarView("templates"); }}
        onSelectWorkspace={(id) => { data.setActiveWorkspaceId(id); navTo(undefined); }}
        onWorkspaceCreated={(ws) => {
          data.setWorkspaces((prev) => [...prev, ws]);
          data.setActiveWorkspaceId(ws.id);
          navTo(undefined);
        }}
        onStatusMessage={(msg) => toast(msg)}
        onLogout={logout}
        onOpenWorkspaceSettings={(id) => setSettingsWorkspaceId(id)}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-surface-raised px-8">
          <form onSubmit={handleSearch} className="w-full max-w-xl">
            <div className="group relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition group-focus-within:text-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              </span>
              <input
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-11 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:ring-2 focus:ring-primary/20"
                type="search"
                placeholder="Search diagrams, folders, or contributors..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
              />
            </div>
          </form>
          <div className="ml-8 flex items-center gap-3">
            <ThemeToggle />
          </div>
          <input ref={fileInputRef} type="file" accept=".excalidraw,.json" onChange={actions.handleImport} className="hidden" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-6">
            <h2 className="font-[family-name:var(--font-family-heading)] text-3xl font-bold tracking-tight text-text-primary">{data.heading}</h2>
            <p className="mt-1 text-text-secondary">{data.subtitle}</p>
          </div>

          {data.isTemplates ? (
            <TemplatesView onStatusMessage={(msg) => toast(msg)} />
          ) : (
            <>
              {data.isWorkspaceView && (
                <WorkspaceToolbar
                  viewMode={viewMode}
                  actionPending={actions.actionPending}
                  creatingFolder={creatingFolder}
                  newFolderName={newFolderName}
                  onCreateDiagram={() => actions.openTemplatePicker()}
                  onStartCreatingFolder={() => setCreatingFolder(true)}
                  onCancelCreatingFolder={() => setCreatingFolder(false)}
                  onNewFolderNameChange={setNewFolderName}
                  onCreateFolder={() => { actions.createFolder(newFolderName); setNewFolderName(""); setCreatingFolder(false); }}
                  onImport={() => fileInputRef.current?.click()}
                  onDriveImport={() => setDriveImportOpen(true)}
                  onViewModeChange={setViewMode}
                />
              )}

              {data.isWorkspaceView && data.folders.length > 0 ? (
                <WorkspaceView
                  diagrams={data.displayDiagrams}
                  folders={data.folders}
                  allTags={data.allTags}
                  viewMode={viewMode}
                  actionPending={actions.actionPending}
                  onCreateDiagram={actions.openTemplatePicker}
                  onDeleteFolder={(id) => actions.deleteFolder(id, setSearchParams)}
                  workspaces={data.workspaces}
                  activeWorkspaceId={data.activeWorkspaceId}
                  {...diagramActions}
                />
              ) : (
                <GeneralView
                  diagrams={data.displayDiagrams}
                  folders={data.folders}
                  allTags={data.allTags}
                  viewMode={viewMode}
                  emptyMessage={emptyMessage}
                  workspaces={data.workspaces}
                  activeWorkspaceId={data.activeWorkspaceId}
                  {...diagramActions}
                />
              )}
            </>
          )}
        </div>
      </main>

      {shareModalDiagramId && (
        <ShareModal open onClose={() => setShareModalDiagramId(null)} diagramId={shareModalDiagramId} />
      )}
      <DriveImportModal open={driveImportOpen} onClose={() => setDriveImportOpen(false)} onImported={(id) => navigate(`/board/${id}`)} />
      <TemplatePicker
        open={actions.templatePickerOpen}
        workspaceId={data.activeWorkspaceId}
        onClose={() => actions.setTemplatePickerOpen(false)}
        onBlank={actions.createBlankDiagram}
        onUseBuiltIn={actions.createFromBuiltIn}
        onUseTemplate={actions.createFromTemplate}
      />

      <Drawer
        open={!!settingsWorkspaceId}
        onClose={() => setSettingsWorkspaceId(null)}
        title="Workspace Settings"
        subtitle={data.workspaces.find((w) => w.id === settingsWorkspaceId)?.name}
        icon={
          settingsWorkspaceId ? (
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{
                backgroundColor: (data.workspaces.find((w) => w.id === settingsWorkspaceId)?.color ?? "#6366f1") + "20",
                color: data.workspaces.find((w) => w.id === settingsWorkspaceId)?.color ?? "#6366f1",
              }}
            >
              {data.workspaces.find((w) => w.id === settingsWorkspaceId)?.icon || data.workspaces.find((w) => w.id === settingsWorkspaceId)?.name.charAt(0).toUpperCase()}
            </div>
          ) : undefined
        }
      >
        {settingsWorkspaceId && (
          <WorkspaceSettingsContent
            workspaceId={settingsWorkspaceId}
            onClose={() => setSettingsWorkspaceId(null)}
            onStatusMessage={(msg) => toast(msg)}
            onWorkspaceUpdated={() => {
              workspacesApi.list().then((res) => {
                const ws = res.workspaces ?? [];
                data.setWorkspaces(ws);
                if (!ws.some((w) => w.id === data.activeWorkspaceId)) {
                  const personal = ws.find((w) => w.isPersonal);
                  if (personal) data.setActiveWorkspaceId(personal.id);
                }
              }).catch(() => {});
            }}
          />
        )}
      </Drawer>
    </div>
  );
}
