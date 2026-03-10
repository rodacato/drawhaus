import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { diagramsApi } from "@/api/diagrams";
import { foldersApi } from "@/api/folders";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";
import { ShareModal } from "@/components/ShareModal";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; starred?: boolean; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };

type SidebarView = "all" | "recent" | "starred" | "unfiled" | "folder";

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => (localStorage.getItem("drawhaus_view") as "grid" | "list") ?? "grid");
  const [sidebarView, setSidebarView] = useState<SidebarView>("all");
  const [shareModalDiagramId, setShareModalDiagramId] = useState<string | null>(null);

  const folderIdParam = searchParams.get("folderId");
  const searchQuery = searchParams.get("q") ?? "";
  const folderId = folderIdParam === null ? undefined : folderIdParam === "null" ? null : folderIdParam;

  const loadData = useCallback(async () => {
    try {
      const [foldersRes, diagramsRes] = await Promise.all([
        foldersApi.list(),
        searchQuery
          ? diagramsApi.search(searchQuery)
          : diagramsApi.list(folderId !== undefined ? { folderId: folderId === null ? "null" : folderId } : undefined),
      ]);
      setFolders(foldersRes.folders ?? []);
      const d = diagramsRes.diagrams ?? (Array.isArray(diagramsRes) ? diagramsRes : []);
      setDiagrams(d);
    } catch { /* silent */ }
    setLoading(false);
  }, [folderId, searchQuery]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derive sidebar view from search params
  useEffect(() => {
    if (searchQuery) return;
    if (folderIdParam === null) setSidebarView("all");
    else if (folderIdParam === "null") setSidebarView("unfiled");
    else setSidebarView("folder");
  }, [folderIdParam, searchQuery]);

  // Persist view mode
  useEffect(() => { localStorage.setItem("drawhaus_view", viewMode); }, [viewMode]);

  // Filter diagrams based on sidebar view
  const displayDiagrams = (() => {
    if (sidebarView === "recent") {
      return [...diagrams].sort((a, b) => {
        const da = new Date(a.updatedAt ?? a.updated_at ?? 0).getTime();
        const db = new Date(b.updatedAt ?? b.updated_at ?? 0).getTime();
        return db - da;
      }).slice(0, 10);
    }
    if (sidebarView === "starred") {
      return diagrams.filter((d) => d.starred);
    }
    return diagrams;
  })();

  const currentFolder = folderId ? folders.find((f) => f.id === folderId) : null;
  const heading = searchQuery
    ? `Search: "${searchQuery}"`
    : sidebarView === "recent"
      ? "Recent"
      : sidebarView === "starred"
        ? "Starred"
        : currentFolder
          ? currentFolder.name
          : folderId === null
            ? "Unfiled"
            : "All Diagrams";

  // --- Sidebar ---
  const [sidebarSearch, setSidebarSearch] = useState(searchQuery);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const isAll = sidebarView === "all" && !searchQuery;
  const isRecent = sidebarView === "recent";
  const isStarred = sidebarView === "starred";
  const isUnfiled = sidebarView === "unfiled";

  function navTo(fId?: string | null) {
    if (fId === undefined) { setSearchParams({}); setSidebarView("all"); }
    else if (fId === null) { setSearchParams({ folderId: "null" }); setSidebarView("unfiled"); }
    else { setSearchParams({ folderId: fId }); setSidebarView("folder"); }
  }

  function navToRecent() {
    setSearchParams({});
    setSidebarView("recent");
  }

  function navToStarred() {
    setSearchParams({});
    setSidebarView("starred");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (sidebarSearch.trim()) setSearchParams({ q: sidebarSearch.trim() });
    else setSearchParams({});
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    try {
      await foldersApi.create(newFolderName.trim());
      setNewFolderName("");
      setCreatingFolder(false);
      loadData();
    } catch { /* silent */ }
  }

  async function deleteFolder(id: string) {
    try {
      await foldersApi.delete(id);
      if (folderId === id) setSearchParams({});
      loadData();
    } catch { /* silent */ }
  }

  // --- Actions ---
  async function createDiagram() {
    setActionPending(true);
    setActionStatus(null);
    try {
      const payload = await diagramsApi.create({ title: "Untitled", folderId: folderId ?? undefined });
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
      const payload = await diagramsApi.create({ title, folderId: folderId ?? undefined, elements: data.elements });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else { setActionStatus("Imported, but missing id."); loadData(); }
    } catch { setActionStatus("Could not read file."); }
    finally { setActionPending(false); }
  }

  async function moveDiagram(diagramId: string, targetFolderId: string | null) {
    try {
      await diagramsApi.move(diagramId, targetFolderId);
      loadData();
    } catch { /* silent */ }
  }

  async function deleteDiagram(diagramId: string, title: string) {
    if (!window.confirm(`Delete "${title || "Untitled"}"? This cannot be undone.`)) return;
    try {
      await diagramsApi.delete(diagramId);
      loadData();
    } catch { /* silent */ }
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

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-text-muted">Loading...</div>;
  }

  const navBtnClass = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-raised"}`;

  return (
    <div className="flex min-h-0 flex-1 gap-6">
      {/* Sidebar */}
      <aside className="sticky top-0 flex w-56 shrink-0 flex-col self-start" style={{ maxHeight: "calc(100vh - 5rem)" }}>
        {/* User profile — compact top row */}
        {user && (
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold uppercase text-white">
              {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-text-primary">{user.name}</p>
              <p className="truncate text-[11px] leading-tight text-text-muted">{user.email}</p>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Search */}
          <form onSubmit={handleSearch} className="group relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted transition group-focus-within:text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            </span>
            <input className={`${ui.input} !pl-9`} type="search" placeholder="Search diagrams..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} />
          </form>

          {/* Main nav */}
          <nav className="space-y-0.5">
            <button onClick={() => navTo(undefined)} className={navBtnClass(isAll)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              All Diagrams
            </button>
            <button onClick={navToRecent} className={navBtnClass(isRecent)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Recent
            </button>
            <button onClick={navToStarred} className={navBtnClass(isStarred)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Starred
            </button>
            <button onClick={() => navTo(null)} className={navBtnClass(isUnfiled)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
              Unfiled
            </button>
          </nav>

          {/* Folders */}
          <div>
            <div className="flex items-center justify-between px-3 pb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Folders</span>
              <button onClick={() => setCreatingFolder(true)} className="text-xs text-primary hover:text-primary-hover" type="button">+ New</button>
            </div>
            {creatingFolder && (
              <form onSubmit={(e) => { e.preventDefault(); createFolder(); }} className="px-1 pb-1">
                <input className="w-full rounded border border-border bg-surface px-2 py-1 text-sm" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }} />
              </form>
            )}
            <div className="space-y-0.5">
              {folders.map((folder) => (
                <div key={folder.id} className="group flex items-center">
                  <button onClick={() => navTo(folder.id)} className={`flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${folderId === folder.id ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-raised"}`} type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                    {folder.name}
                  </button>
                  <button onClick={() => deleteFolder(folder.id)} className="hidden rounded px-1 text-xs text-text-muted hover:text-red-600 group-hover:block" title="Delete folder" type="button">x</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Utility links — pinned at bottom */}
        {user && (
          <div className="mt-auto shrink-0 flex items-center gap-1 border-t border-border pt-3 px-1">
            {user.role === "admin" && (
              <Link to="/admin" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-text-muted transition hover:bg-surface-raised hover:text-text-secondary" title="Admin Panel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                Admin
              </Link>
            )}
            <Link to="/settings" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-text-muted transition hover:bg-surface-raised hover:text-text-secondary" title="Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
              Settings
            </Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className={ui.h1}>{heading}</h1>
            <p className={ui.subtitle}>{searchQuery ? `${displayDiagrams.length} result${displayDiagrams.length !== 1 ? "s" : ""}` : "Manage your boards and start a new one."}</p>
          </div>

          {/* Grid / List view toggle */}
          <div className="flex items-center rounded-lg border border-border bg-surface p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center rounded-md p-1.5 transition ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text-secondary"}`}
              title="Grid view"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center justify-center rounded-md p-1.5 transition ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-text-muted hover:text-text-secondary"}`}
              title="List view"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
          </div>
        </div>

        <div className={ui.card}>
          <div className="mb-6 space-y-3">
            <div className="flex gap-3">
              <button className={`${ui.btn} ${ui.btnPrimary}`} onClick={createDiagram} disabled={actionPending}>{actionPending ? "Creating..." : "Create Diagram"}</button>
              <button className={`${ui.btn} ${ui.btnSecondary}`} onClick={() => fileInputRef.current?.click()} disabled={actionPending}>Import .excalidraw</button>
              <input ref={fileInputRef} type="file" accept=".excalidraw,.json" onChange={handleImport} className="hidden" />
            </div>
            {actionStatus && <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary">{actionStatus}</p>}
          </div>

          {displayDiagrams.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className={ui.empty}>
                {searchQuery ? "No diagrams match your search."
                  : sidebarView === "starred" ? "No starred diagrams yet. Star a diagram to see it here."
                  : sidebarView === "recent" ? "No recent diagrams."
                  : "No diagrams here yet. Create your first one."}
              </div>
              <button
                onClick={createDiagram}
                disabled={actionPending}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-text-muted transition hover:border-primary hover:text-primary"
                type="button"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span className="mt-2 text-sm font-medium">Create New</span>
              </button>
            </div>
          ) : viewMode === "list" ? (
            /* List view */
            <div className="divide-y divide-border rounded-lg border border-border">
              {displayDiagrams.map((diagram) => (
                <div key={diagram.id} className="group flex items-center gap-4 px-4 py-3 transition hover:bg-surface-raised">
                  {/* Thumbnail */}
                  <Link to={`/board/${diagram.id}`} className="block h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                    {diagram.thumbnail ? (
                      <img src={diagram.thumbnail} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-text-muted">—</div>
                    )}
                  </Link>

                  {/* Title + date */}
                  <Link to={`/board/${diagram.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{diagram.title || "Untitled"}</p>
                    <p className="text-xs text-text-muted">{new Date(diagram.updatedAt ?? diagram.updated_at ?? "").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </Link>

                  {/* Star */}
                  <button
                    onClick={() => toggleStar(diagram.id, !diagram.starred)}
                    className={`shrink-0 rounded p-1 transition ${diagram.starred ? "text-yellow-500" : "text-text-muted opacity-0 group-hover:opacity-100"} hover:text-yellow-500`}
                    title={diagram.starred ? "Unstar" : "Star"}
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={diagram.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  </button>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => setShareModalDiagramId(diagram.id)} className="rounded p-1 text-text-muted hover:text-primary" title="Share" type="button">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                    </button>
                    <button onClick={() => duplicateDiagram(diagram.id)} className="rounded p-1 text-text-muted hover:text-primary" title="Duplicate" type="button">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                    </button>
                    <button onClick={() => deleteDiagram(diagram.id, diagram.title)} className="rounded p-1 text-text-muted hover:text-red-500" title="Delete" type="button">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Grid view */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayDiagrams.map((diagram) => (
                <DiagramCard
                  key={diagram.id}
                  diagram={diagram}
                  folders={folders}
                  onMove={moveDiagram}
                  onDelete={deleteDiagram}
                  onDuplicate={duplicateDiagram}
                  onToggleStar={toggleStar}
                  onShare={(id) => setShareModalDiagramId(id)}
                />
              ))}
              <button
                onClick={createDiagram}
                disabled={actionPending}
                className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border text-text-muted transition hover:border-primary hover:text-primary"
                type="button"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span className="mt-2 text-sm font-medium">Create New</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalDiagramId && (
        <ShareModal
          open
          onClose={() => setShareModalDiagramId(null)}
          diagramId={shareModalDiagramId}
        />
      )}
    </div>
  );
}

// --- DiagramCard component ---
function DiagramCard({
  diagram,
  folders,
  onMove,
  onDelete,
  onDuplicate,
  onToggleStar,
  onShare,
}: {
  diagram: Diagram;
  folders: Folder[];
  onMove: (id: string, folderId: string | null) => void;
  onDelete: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onShare: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveSubOpen, setMoveSubOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const moveOptions = [{ id: null as string | null, name: "Unfiled" }, ...folders].filter((f) => f.id !== diagram.folderId);

  function toggleMenu() {
    if (!menuOpen && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 });
    }
    setMenuOpen(!menuOpen);
    setMoveSubOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
    setMoveSubOpen(false);
  }

  return (
    <article className="group relative rounded-xl border border-border bg-surface">
      <Link to={`/board/${diagram.id}`} className="block overflow-hidden rounded-t-xl">
        <div className="aspect-4/3 bg-surface-raised">
          {diagram.thumbnail ? (
            <img src={diagram.thumbnail} alt={diagram.title || "Untitled"} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">No preview</div>
          )}
        </div>
      </Link>

      {/* Three-dot more button — top-right on hover */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          ref={menuBtnRef}
          onClick={toggleMenu}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-dark/80 text-white shadow-md transition hover:bg-surface-dark"
          title="More actions"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
        </button>
      </div>

      {/* Three-dot dropdown menu */}
      {menuOpen && menuPos && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeMenu} />
          <div className="fixed z-50 w-44 rounded-lg border border-border bg-surface-raised py-1 shadow-xl" style={{ top: menuPos.top, left: menuPos.left }}>
            {/* Share */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface" type="button" onClick={() => { closeMenu(); onShare(diagram.id); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              Share
            </button>

            {/* Move — with sub-menu */}
            <div className="relative">
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface"
                type="button"
                onClick={() => setMoveSubOpen(!moveSubOpen)}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                  Move
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              {moveSubOpen && moveOptions.length > 0 && (
                <div className="absolute left-full top-0 ml-1 w-40 rounded-lg border border-border bg-surface-raised py-1 shadow-xl">
                  {moveOptions.map((opt) => (
                    <button
                      key={opt.id ?? "unfiled"}
                      onClick={() => { closeMenu(); onMove(diagram.id, opt.id); }}
                      className="w-full px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface"
                      type="button"
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Duplicate */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface" type="button" onClick={() => { closeMenu(); onDuplicate(diagram.id); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              Duplicate
            </button>

            {/* Delete */}
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-500 transition hover:bg-red-500/10"
              type="button"
              onClick={() => { closeMenu(); onDelete(diagram.id, diagram.title); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              Delete
            </button>
          </div>
        </>
      )}

      {/* Card footer */}
      <div className="flex items-start justify-between p-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-text-primary">{diagram.title || "Untitled"}</h2>
          <p className="mt-1 text-xs text-text-secondary">{new Date(diagram.updatedAt ?? diagram.updated_at ?? "").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pl-2">
          {/* Star button */}
          <button
            onClick={() => onToggleStar(diagram.id, !diagram.starred)}
            className={`rounded p-0.5 transition ${diagram.starred ? "text-yellow-500" : "text-text-muted hover:text-yellow-500"}`}
            title={diagram.starred ? "Unstar" : "Star"}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={diagram.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}
