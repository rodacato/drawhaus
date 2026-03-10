import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { diagramsApi } from "@/api/diagrams";
import { foldersApi } from "@/api/folders";
import { ui } from "@/lib/ui";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };

export function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

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

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 space-y-4">
        <form onSubmit={handleSearch}>
          <input className={ui.input} type="search" placeholder="Search diagrams..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} />
        </form>
        <nav className="space-y-1">
          <button onClick={() => navTo(undefined)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${isAll ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-raised"}`} type="button">All Diagrams</button>
          <button onClick={() => navTo(null)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${isUnfiled ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-raised"}`} type="button">Unfiled</button>
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
                <button onClick={() => navTo(folder.id)} className={`flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${folderId === folder.id ? "bg-primary/10 font-medium text-primary" : "text-text-secondary hover:bg-surface-raised"}`} type="button">{folder.name}</button>
                <button onClick={() => deleteFolder(folder.id)} className="hidden rounded px-1 text-xs text-text-muted hover:text-red-600 group-hover:block" title="Delete folder" type="button">x</button>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className={ui.h1}>{heading}</h1>
          <p className={ui.subtitle}>{searchQuery ? `${diagrams.length} result${diagrams.length !== 1 ? "s" : ""}` : "Manage your boards and start a new one."}</p>
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
            <div className={ui.empty}>{searchQuery ? "No diagrams match your search." : "No diagrams here yet. Create your first one."}</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diagrams.map((diagram) => (
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
                  {/* Hover actions — top-right overlay */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <MoveToMenu diagramId={diagram.id} folders={folders} currentFolderId={diagram.folderId} onMove={moveDiagram} />
                    <button
                      onClick={() => deleteDiagram(diagram.id, diagram.title)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white shadow-md transition hover:bg-red-600"
                      title="Delete diagram"
                      type="button"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                  <div className="p-3">
                    <h2 className="truncate text-sm font-semibold text-text">{diagram.title || "Untitled"}</h2>
                    <p className="mt-1 text-xs text-text-secondary">{new Date(diagram.updatedAt ?? diagram.updated_at ?? "").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline MoveToMenu component — uses fixed positioning so it isn't clipped by card overflow
function MoveToMenu({ diagramId, folders, currentFolderId, onMove }: { diagramId: string; folders: Folder[]; currentFolderId: string | null; onMove: (id: string, folderId: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const options = [{ id: null as string | null, name: "Unfiled" }, ...folders].filter((f) => f.id !== currentFolderId);
  if (options.length === 0) return null;

  function toggle() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right });
    }
    setOpen(!open);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-dark/80 text-white shadow-md transition hover:bg-surface-dark"
        title="Move to folder"
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
      </button>
      {open && pos && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-44 rounded-lg border border-border bg-surface-raised shadow-xl" style={{ top: pos.top, left: pos.left - 176 }}>
            <p className="border-b border-border px-3 py-1.5 text-xs font-semibold text-text-muted">Move to folder</p>
            {options.map((opt) => (
              <button key={opt.id ?? "unfiled"} onClick={() => { setOpen(false); onMove(diagramId, opt.id); }} className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface transition" type="button">{opt.name}</button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
