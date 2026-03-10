import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { diagramsApi } from "@/api/diagrams";
import { foldersApi } from "@/api/folders";
import { useAuth } from "@/contexts/AuthContext";
import { ui } from "@/lib/ui";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };

const CATEGORY_TAGS = ["UX", "Dev", "Arch", "API", "Flow"];

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  const currentFolder = folderId ? folders.find((f) => f.id === folderId) : null;
  const heading = searchQuery ? `Search: "${searchQuery}"` : currentFolder ? currentFolder.name : folderId === null ? "Unfiled" : "All Diagrams";

  // --- Sidebar ---
  const [sidebarSearch, setSidebarSearch] = useState(searchQuery);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const isAll = folderId === undefined && !searchQuery;
  const isUnfiled = folderId === null;

  function navTo(fId?: string | null) {
    if (fId === undefined) setSearchParams({});
    else if (fId === null) setSearchParams({ folderId: "null" });
    else setSearchParams({ folderId: fId });
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

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-text-muted">Loading...</div>;
  }

  const navBtnClass = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-raised"}`;

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col">
        <div className="space-y-4 flex-1">
          {/* Search with focus icon color */}
          <form onSubmit={handleSearch} className="group relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            </span>
            <input className={`${ui.input} !pl-9`} type="search" placeholder="Search diagrams..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} />
          </form>

          <nav className="space-y-1">
            {/* All Diagrams */}
            <button onClick={() => navTo(undefined)} className={navBtnClass(isAll)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
              All Diagrams
            </button>

            {/* Recent (visual only) */}
            <button className={navBtnClass(false)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Recent
            </button>

            {/* Starred (visual only) */}
            <button className={navBtnClass(false)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Starred
            </button>

            {/* Unfiled */}
            <button onClick={() => navTo(null)} className={navBtnClass(isUnfiled)} type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
              Unfiled
            </button>

            {/* Folders */}
            <div className="pt-2">
              <div className="flex items-center justify-between px-3 pb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Folders</span>
                <button onClick={() => setCreatingFolder(true)} className="text-xs text-primary hover:text-primary-hover" type="button">+ New</button>
              </div>
              {creatingFolder && (
                <form onSubmit={(e) => { e.preventDefault(); createFolder(); }} className="px-1 pb-1">
                  <input className="w-full rounded border border-border bg-surface px-2 py-1 text-sm" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }} />
                </form>
              )}
              {folders.map((folder) => (
                <div key={folder.id} className="group flex items-center">
                  <button onClick={() => navTo(folder.id)} className={`flex-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${folderId === folder.id ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-raised"}`} type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                    {folder.name}
                  </button>
                  <button onClick={() => deleteFolder(folder.id)} className="hidden rounded px-1 text-xs text-text-muted hover:text-red-600 group-hover:block" title="Delete folder" type="button">x</button>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* User profile section */}
        {user && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white uppercase">
              {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{user.name}</p>
              <p className="truncate text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className={ui.h1}>{heading}</h1>
            <p className={ui.subtitle}>{searchQuery ? `${diagrams.length} result${diagrams.length !== 1 ? "s" : ""}` : "Manage your boards and start a new one."}</p>
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
          {diagrams.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className={ui.empty}>{searchQuery ? "No diagrams match your search." : "No diagrams here yet. Create your first one."}</div>
              {/* Create New placeholder card */}
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
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diagrams.map((diagram, idx) => (
                <DiagramCard
                  key={diagram.id}
                  diagram={diagram}
                  folders={folders}
                  categoryTag={CATEGORY_TAGS[idx % CATEGORY_TAGS.length]}
                  onMove={moveDiagram}
                  onDelete={deleteDiagram}
                />
              ))}
              {/* Create New placeholder card */}
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
    </div>
  );
}

// --- DiagramCard component with three-dot menu, star, and category tag ---
function DiagramCard({
  diagram,
  folders,
  categoryTag,
  onMove,
  onDelete,
}: {
  diagram: Diagram;
  folders: Folder[];
  categoryTag: string;
  onMove: (id: string, folderId: string | null) => void;
  onDelete: (id: string, title: string) => void;
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

  const tagColors: Record<string, string> = {
    UX: "bg-violet-100 text-violet-700",
    Dev: "bg-blue-100 text-blue-700",
    Arch: "bg-amber-100 text-amber-700",
    API: "bg-emerald-100 text-emerald-700",
    Flow: "bg-rose-100 text-rose-700",
  };

  return (
    <article className="group relative rounded-xl border border-border bg-surface" key={diagram.id}>
      <Link to={`/board/${diagram.id}`} className="block overflow-hidden rounded-t-xl">
        <div className="aspect-4/3 bg-gray-50">
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
            {/* Share (visual only) */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface transition" type="button" onClick={closeMenu}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              Share
            </button>

            {/* Move — with sub-menu */}
            <div className="relative">
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface transition"
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
                      className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface transition"
                      type="button"
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Duplicate (visual only) */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface transition" type="button" onClick={closeMenu}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              Duplicate
            </button>

            {/* Delete — functional */}
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 transition"
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
          <h2 className="truncate text-sm font-semibold text-text">{diagram.title || "Untitled"}</h2>
          <p className="mt-1 text-xs text-text-secondary">{new Date(diagram.updatedAt ?? diagram.updated_at ?? "").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pl-2">
          {/* Category tag badge */}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${tagColors[categoryTag] ?? "bg-gray-100 text-gray-600"}`}>
            {categoryTag}
          </span>
          {/* Star icon (visual only) */}
          <svg className="text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        </div>
      </div>
    </article>
  );
}

