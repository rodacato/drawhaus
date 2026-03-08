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
          <button onClick={() => navTo(undefined)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${isAll ? "bg-accent/10 font-medium text-accent" : "text-text-secondary hover:bg-surface-raised"}`} type="button">All Diagrams</button>
          <button onClick={() => navTo(null)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${isUnfiled ? "bg-accent/10 font-medium text-accent" : "text-text-secondary hover:bg-surface-raised"}`} type="button">Unfiled</button>
          <div className="pt-2">
            <div className="flex items-center justify-between px-3 pb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Folders</span>
              <button onClick={() => setCreatingFolder(true)} className="text-xs text-accent hover:text-accent-hover" type="button">+ New</button>
            </div>
            {creatingFolder && (
              <form onSubmit={(e) => { e.preventDefault(); createFolder(); }} className="px-1 pb-1">
                <input className="w-full rounded border border-border bg-surface px-2 py-1 text-sm" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus onBlur={() => { if (!newFolderName.trim()) setCreatingFolder(false); }} />
              </form>
            )}
            {folders.map((folder) => (
              <div key={folder.id} className="group flex items-center">
                <button onClick={() => navTo(folder.id)} className={`flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${folderId === folder.id ? "bg-accent/10 font-medium text-accent" : "text-text-secondary hover:bg-surface-raised"}`} type="button">{folder.name}</button>
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
                <article className="group overflow-hidden rounded-xl border border-border bg-surface" key={diagram.id}>
                  <Link to={`/board/${diagram.id}`} className="block">
                    <div className="aspect-4/3 bg-gray-50">
                      {diagram.thumbnail ? (
                        <img src={diagram.thumbnail} alt={diagram.title || "Untitled"} className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-text-secondary">No preview</div>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-text">{diagram.title || "Untitled"}</h2>
                      <p className="text-xs text-text-secondary">{diagram.updatedAt ?? diagram.updated_at ?? "unknown"}</p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-1">
                      <MoveToMenu diagramId={diagram.id} folders={folders} currentFolderId={diagram.folderId} onMove={moveDiagram} />
                    </div>
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

// Inline MoveToMenu component
function MoveToMenu({ diagramId, folders, currentFolderId, onMove }: { diagramId: string; folders: Folder[]; currentFolderId: string | null; onMove: (id: string, folderId: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const options = [{ id: null as string | null, name: "Unfiled" }, ...folders].filter((f) => f.id !== currentFolderId);
  if (options.length === 0) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-secondary hover:bg-surface-raised transition" type="button">Move to...</button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-border bg-surface-raised py-1 shadow-lg">
            {options.map((opt) => (
              <button key={opt.id ?? "unfiled"} onClick={() => { setOpen(false); onMove(diagramId, opt.id); }} className="w-full px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface transition" type="button">{opt.name}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
