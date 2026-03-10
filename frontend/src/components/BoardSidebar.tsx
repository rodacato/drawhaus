import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { diagramsApi } from "@/api/diagrams";
import { useAuth } from "@/contexts/AuthContext";

type Diagram = { id: string; title: string; updatedAt?: string; updated_at?: string };

type BoardSidebarProps = {
  userEmail: string;
  isOpen: boolean;
  onToggle: () => void;
};

export function BoardSidebar({ userEmail, isOpen, onToggle }: BoardSidebarProps) {
  const navigate = useNavigate();
  const { id: currentId } = useParams<{ id: string }>();
  const { logout } = useAuth();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      diagramsApi.list().then((res) => {
        setDiagrams(Array.isArray(res) ? res : res.diagrams ?? []);
      }).catch(() => {});
    }
  }, [isOpen]);

  async function createDiagram() {
    setCreating(true);
    try {
      const payload = await diagramsApi.create({ title: "Untitled" });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
    } catch { /* silent */ }
    finally { setCreating(false); }
  }

  async function handleLogout() {
    await logout();
  }

  return (
    <>
      {!isOpen && (
        <button onClick={onToggle} className="fixed left-0 top-1/2 z-50 -translate-y-1/2 flex h-12 w-6 items-center justify-center rounded-r-lg bg-[#1e1e2e]/80 text-white/60 shadow-lg backdrop-blur-sm transition hover:w-8 hover:bg-[#1e1e2e] hover:text-white" title="Open menu" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      )}

      {isOpen && <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]" onClick={onToggle} />}

      <aside className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col bg-[#1e1e2e] text-white/90 shadow-2xl transition-transform duration-200 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <span className="font-mono text-sm font-semibold tracking-tight text-white">drawhaus</span>
          <button onClick={onToggle} className="flex h-7 w-7 items-center justify-center rounded text-white/50 transition hover:bg-white/10 hover:text-white" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="border-b border-white/10 p-3">
          <button onClick={createDiagram} disabled={creating} className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary font-mono text-xs font-medium text-white transition hover:bg-primary-hover disabled:opacity-50" type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            {creating ? "Creating..." : "New diagram"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {diagrams.length === 0 ? (
            <p className="px-2 py-4 text-center font-mono text-xs text-white/40">No diagrams yet</p>
          ) : (
            <ul className="space-y-0.5">
              {diagrams.map((d) => {
                const isActive = d.id === currentId;
                return (
                  <li key={d.id}>
                    <Link to={`/board/${d.id}`} className={`flex flex-col rounded-lg px-3 py-2 transition ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/80"}`}>
                      <span className="truncate font-mono text-sm">{d.title || "Untitled"}</span>
                      <span className="font-mono text-[10px] text-white/30">{d.updatedAt ?? d.updated_at ?? ""}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 truncate font-mono text-xs text-white/50">{userEmail}</div>
          <div className="flex gap-2">
            <Link to="/dashboard" className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 font-mono text-xs text-white/60 transition hover:bg-white/5 hover:text-white">Dashboard</Link>
            <button onClick={handleLogout} className="flex h-8 flex-1 items-center justify-center rounded-lg border border-white/10 font-mono text-xs text-white/60 transition hover:bg-white/5 hover:text-white" type="button">Logout</button>
          </div>
        </div>
      </aside>
    </>
  );
}
