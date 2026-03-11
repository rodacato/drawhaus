import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { diagramsApi } from "@/api/diagrams";
import { foldersApi } from "@/api/folders";
import { shareApi } from "@/api/share";
import { tagsApi, type Tag } from "@/api/tags";
import { workspacesApi, type Workspace } from "@/api/workspaces";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShareModal } from "@/components/ShareModal";
import { DriveImportModal } from "@/components/DriveImportModal";
import { DashboardSidebar, WorkspaceToolbar, WorkspaceView, GeneralView } from "@/components/dashboard";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; starred?: boolean; tags?: Tag[]; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };
type SidebarView = "all" | "recent" | "starred" | "unfiled" | "folder";

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => (localStorage.getItem("drawhaus_view") as "grid" | "list") ?? "grid");
  const [sidebarView, setSidebarView] = useState<SidebarView>("recent");
  const [shareModalDiagramId, setShareModalDiagramId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [driveImportOpen, setDriveImportOpen] = useState(false);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => localStorage.getItem("drawhaus_workspace"));

  // Folder creation state
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState(searchParams.get("q") ?? "");

  const folderIdParam = searchParams.get("folderId");
  const searchQuery = searchParams.get("q") ?? "";
  const folderId = folderIdParam === null ? undefined : folderIdParam === "null" ? null : folderIdParam;
  const isRecent = sidebarView === "recent";
  const isStarred = sidebarView === "starred";
  const isWorkspaceView = sidebarView === "all";

  // ── Load workspaces on mount ──
  useEffect(() => {
    workspacesApi.list().then((res) => {
      const ws = res.workspaces ?? [];
      setWorkspaces(ws);
      const saved = localStorage.getItem("drawhaus_workspace");
      if (saved && ws.some((w) => w.id === saved)) {
        setActiveWorkspaceId(saved);
      } else {
        const personal = ws.find((w) => w.isPersonal);
        if (personal) {
          setActiveWorkspaceId(personal.id);
          localStorage.setItem("drawhaus_workspace", personal.id);
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) localStorage.setItem("drawhaus_workspace", activeWorkspaceId);
  }, [activeWorkspaceId]);

  // ── Load data ──
  const isGlobalView = sidebarView === "recent" || sidebarView === "starred";

  const loadData = useCallback(async () => {
    if (!activeWorkspaceId && !isGlobalView) return;
    try {
      // Recent/Starred fetch diagrams across ALL workspaces (no workspaceId filter)
      const params: { folderId?: string; workspaceId?: string } = {};
      if (!isGlobalView) {
        params.workspaceId = activeWorkspaceId!;
        if (folderId !== undefined) params.folderId = folderId === null ? "null" : folderId;
      }

      const [foldersRes, diagramsRes, tagsRes] = await Promise.all([
        activeWorkspaceId ? foldersApi.list(activeWorkspaceId) : Promise.resolve({ folders: [] }),
        searchQuery ? diagramsApi.search(searchQuery) : diagramsApi.list(params),
        tagsApi.list(),
      ]);
      setFolders(foldersRes.folders ?? []);
      setDiagrams(diagramsRes.diagrams ?? (Array.isArray(diagramsRes) ? diagramsRes : []));
      setAllTags(tagsRes.tags ?? []);
    } catch { /* silent */ }
    setLoading(false);
  }, [folderId, searchQuery, activeWorkspaceId, isGlobalView]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derive sidebar view from search params
  useEffect(() => {
    if (searchQuery) return;
    if (folderIdParam === null) {
      if (sidebarView !== "recent" && sidebarView !== "starred") setSidebarView("all");
    }
    else if (folderIdParam === "null") setSidebarView("unfiled");
    else setSidebarView("folder");
  }, [folderIdParam, searchQuery]);

  useEffect(() => { localStorage.setItem("drawhaus_view", viewMode); }, [viewMode]);

  // ── Derived data ──
  const displayDiagrams = (() => {
    if (isRecent) {
      return [...diagrams].sort((a, b) => {
        const da = new Date(a.updatedAt ?? a.updated_at ?? 0).getTime();
        const db = new Date(b.updatedAt ?? b.updated_at ?? 0).getTime();
        return db - da;
      }).slice(0, 10);
    }
    if (isStarred) return diagrams.filter((d) => d.starred);
    return diagrams;
  })();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const heading = searchQuery
    ? `Search: "${searchQuery}"`
    : isRecent ? "Recent"
    : isStarred ? "Starred"
    : activeWorkspace ? (activeWorkspace.isPersonal ? "Personal" : activeWorkspace.name)
    : "Diagrams";

  const subtitle = searchQuery
    ? `${displayDiagrams.length} result${displayDiagrams.length !== 1 ? "s" : ""}`
    : isRecent ? "Recently edited diagrams"
    : isStarred ? "Your starred diagrams"
    : isWorkspaceView && activeWorkspace
      ? (activeWorkspace.isPersonal ? "Personal workspace" : `${activeWorkspace.name} workspace`)
      : "Manage and organize your visual workflows";

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

  // ── CRUD actions ──
  async function createDiagram(targetFolderId?: string) {
    setActionPending(true);
    setActionStatus(null);
    try {
      const payload = await diagramsApi.create({ title: "Untitled", folderId: targetFolderId ?? folderId ?? undefined, workspaceId: activeWorkspaceId ?? undefined });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else { setActionStatus("Diagram created, but missing id."); loadData(); }
    } catch { setActionStatus("Could not create diagram."); }
    finally { setActionPending(false); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setActionPending(true);
    setActionStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.type !== "excalidraw" || !Array.isArray(data.elements)) {
        setActionStatus("Invalid .excalidraw file.");
        setActionPending(false);
        return;
      }
      const title = file.name.replace(/\.(excalidraw|json)$/i, "") || "Imported";
      const payload = await diagramsApi.create({ title, folderId: folderId ?? undefined, workspaceId: activeWorkspaceId ?? undefined, elements: data.elements });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else { setActionStatus("Imported, but missing id."); loadData(); }
    } catch { setActionStatus("Could not read file."); }
    finally { setActionPending(false); }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    try {
      await foldersApi.create(newFolderName.trim(), activeWorkspaceId ?? undefined);
      setNewFolderName("");
      setCreatingFolder(false);
      loadData();
    } catch { /* silent */ }
  }

  async function deleteFolder(id: string) {
    const hasDiagrams = diagrams.some((d) => d.folderId === id);
    if (hasDiagrams) {
      window.alert("Cannot delete this folder because it still contains diagrams. Move or delete them first.");
      return;
    }
    if (!window.confirm("Delete this folder? This cannot be undone.")) return;
    try {
      await foldersApi.delete(id);
      if (folderId === id) setSearchParams({});
      loadData();
    } catch { /* silent */ }
  }

  async function moveDiagram(diagramId: string, targetFolderId: string | null) {
    try { await diagramsApi.move(diagramId, targetFolderId); loadData(); } catch { /* silent */ }
  }

  async function deleteDiagram(diagramId: string, title: string) {
    if (!window.confirm(`Delete "${title || "Untitled"}"? This cannot be undone.`)) return;
    try { await diagramsApi.delete(diagramId); loadData(); } catch { /* silent */ }
  }

  async function duplicateDiagram(diagramId: string) {
    try {
      const payload = await diagramsApi.duplicate(diagramId);
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else loadData();
    } catch { /* silent */ }
  }

  async function toggleStar(diagramId: string, starred: boolean) {
    try {
      await diagramsApi.toggleStar(diagramId, starred);
      setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, starred } : d));
    } catch { /* silent */ }
  }

  async function embedDiagram(diagramId: string) {
    try {
      const cacheKey = `drawhaus_share_${diagramId}_viewer`;
      let url = localStorage.getItem(cacheKey);
      if (!url) {
        const payload = await shareApi.create(diagramId, "viewer");
        const token = payload.shareLink?.token;
        if (!token) return;
        url = `${window.location.origin}/share/${token}`;
        try { localStorage.setItem(cacheKey, url); } catch { /* quota */ }
      }
      const embedUrl = url.replace("/share/", "/embed/");
      const snippet = `<iframe src="${embedUrl}" width="100%" height="400" style="border:none;border-radius:8px;" loading="lazy"></iframe>`;
      await navigator.clipboard.writeText(snippet);
      setActionStatus("Embed code copied!");
      setTimeout(() => setActionStatus(null), 2000);
    } catch { /* silent */ }
  }

  async function renameDiagram(diagramId: string, newTitle: string) {
    const title = newTitle.trim();
    if (!title) return;
    try {
      await diagramsApi.update(diagramId, { title });
      setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, title } : d));
    } catch { /* silent */ }
  }

  async function toggleTag(diagramId: string, tag: Tag) {
    const diagram = diagrams.find((d) => d.id === diagramId);
    const hasTag = diagram?.tags?.some((t) => t.id === tag.id);
    try {
      if (hasTag) {
        await tagsApi.unassign(tag.id, diagramId);
        setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, tags: (d.tags ?? []).filter((t) => t.id !== tag.id) } : d));
      } else {
        await tagsApi.assign(tag.id, diagramId);
        setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, tags: [...(d.tags ?? []), tag] } : d));
      }
    } catch { /* silent */ }
  }

  async function createTag(name: string, color: string) {
    try {
      const res = await tagsApi.create(name, color);
      setAllTags((prev) => [...prev, res.tag]);
      return res.tag;
    } catch { return null; }
  }

  async function deleteTag(tagId: string) {
    try {
      await tagsApi.delete(tagId);
      setAllTags((prev) => prev.filter((t) => t.id !== tagId));
      setDiagrams((prev) => prev.map((d) => ({ ...d, tags: (d.tags ?? []).filter((t) => t.id !== tagId) })));
    } catch { /* silent */ }
  }

  // Shared diagram action props
  const diagramActions = {
    onMove: moveDiagram,
    onDelete: deleteDiagram,
    onDuplicate: duplicateDiagram,
    onToggleStar: toggleStar,
    onShare: (id: string) => setShareModalDiagramId(id),
    onEmbed: embedDiagram,
    onRename: renameDiagram,
    onToggleTag: toggleTag,
    onCreateTag: createTag,
    onDeleteTag: deleteTag,
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-surface text-sm text-text-muted">Loading...</div>;
  }

  const emptyMessage = searchQuery
    ? "No diagrams match your search."
    : isStarred ? "No starred diagrams yet. Star a diagram to see it here."
    : isRecent ? "No recent diagrams."
    : "No diagrams here yet. Create your first one.";

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <DashboardSidebar
        user={user}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        isRecent={isRecent}
        isStarred={isStarred}
        onNavRecent={() => { setSearchParams({}); setSidebarView("recent"); }}
        onNavStarred={() => { setSearchParams({}); setSidebarView("starred"); }}
        onSelectWorkspace={(id) => { setActiveWorkspaceId(id); navTo(undefined); }}
        onWorkspaceCreated={(ws) => {
          setWorkspaces((prev) => [...prev, ws]);
          setActiveWorkspaceId(ws.id);
          navTo(undefined);
        }}
        onStatusMessage={(msg) => { setActionStatus(msg); setTimeout(() => setActionStatus(null), 3000); }}
        onLogout={logout}
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
          <input ref={fileInputRef} type="file" accept=".excalidraw,.json" onChange={handleImport} className="hidden" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-6">
            <h2 className="font-[family-name:var(--font-family-heading)] text-3xl font-bold tracking-tight text-text-primary">{heading}</h2>
            <p className="mt-1 text-text-secondary">{subtitle}</p>
          </div>

          {isWorkspaceView && (
            <WorkspaceToolbar
              viewMode={viewMode}
              actionPending={actionPending}
              creatingFolder={creatingFolder}
              newFolderName={newFolderName}
              onCreateDiagram={() => createDiagram()}
              onStartCreatingFolder={() => setCreatingFolder(true)}
              onCancelCreatingFolder={() => setCreatingFolder(false)}
              onNewFolderNameChange={setNewFolderName}
              onCreateFolder={createFolder}
              onImport={() => fileInputRef.current?.click()}
              onDriveImport={() => setDriveImportOpen(true)}
              onViewModeChange={setViewMode}
            />
          )}

          {actionStatus && <p className="mb-6 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary">{actionStatus}</p>}

          {isWorkspaceView && folders.length > 0 ? (
            <WorkspaceView
              diagrams={displayDiagrams}
              folders={folders}
              allTags={allTags}
              viewMode={viewMode}
              actionPending={actionPending}
              onCreateDiagram={createDiagram}
              onDeleteFolder={deleteFolder}
              {...diagramActions}
            />
          ) : (
            <GeneralView
              diagrams={displayDiagrams}
              folders={folders}
              allTags={allTags}
              viewMode={viewMode}
              emptyMessage={emptyMessage}
              {...diagramActions}
            />
          )}
        </div>
      </main>

      {shareModalDiagramId && (
        <ShareModal open onClose={() => setShareModalDiagramId(null)} diagramId={shareModalDiagramId} />
      )}
      <DriveImportModal open={driveImportOpen} onClose={() => setDriveImportOpen(false)} onImported={(id) => navigate(`/board/${id}`)} />
    </div>
  );
}
