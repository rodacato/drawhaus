import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { templatesApi, type TemplateDTO } from "@/api/templates";
import { workspacesApi, type Workspace } from "@/api/workspaces";
import { ui } from "@/lib/ui";

type TemplatesViewProps = {
  onStatusMessage: (msg: string) => void;
};

const CATEGORY_COLORS: Record<string, string> = {
  architecture: "bg-blue-50 text-blue-700",
  database: "bg-green-50 text-green-700",
  agile: "bg-orange-50 text-orange-700",
  process: "bg-purple-50 text-purple-700",
  general: "bg-gray-100 text-gray-600",
};

export function TemplatesView({ onStatusMessage }: TemplatesViewProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    Promise.all([
      templatesApi.list().then((res) => res.templates ?? []),
      workspacesApi.list().then((res) => res.workspaces ?? []),
    ]).then(([tpls, ws]) => {
      setTemplates(tpls.filter((t) => !t.isBuiltIn));
      setWorkspaces(ws);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const wsMap = new Map(workspaces.map((w) => [w.id, w]));

  function scopeLabel(t: TemplateDTO) {
    if (!t.workspaceId) return "Personal";
    const ws = wsMap.get(t.workspaceId);
    return ws ? (ws.isPersonal ? "Personal" : ws.name) : "Workspace";
  }

  async function handleUse(template: TemplateDTO) {
    try {
      const res = await templatesApi.use(template.id, { title: template.title });
      const diagram = res.diagram ?? res;
      navigate(`/board/${diagram.id}`);
    } catch {
      onStatusMessage("Could not create diagram from template.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await templatesApi.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      onStatusMessage("Template deleted.");
    } catch {
      onStatusMessage("Could not delete template.");
    }
  }

  async function handleRename(id: string, newTitle: string) {
    if (!newTitle.trim()) return;
    try {
      const res = await templatesApi.update(id, { title: newTitle.trim() });
      const updated = res.template ?? res;
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, ...updated } : t));
    } catch {
      onStatusMessage("Could not rename template.");
    }
    setEditingId(null);
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-text-muted">Loading templates...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className={ui.empty}>
        <p className="mb-1 font-medium">No custom templates yet</p>
        <p>Save a diagram as a template from the board sidebar to see it here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {templates.map((t) => (
        <div
          key={t.id}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface-raised transition hover:shadow-md"
        >
          {/* Thumbnail */}
          <div className="flex h-36 items-center justify-center bg-gray-50 p-2">
            {t.thumbnail ? (
              <img src={t.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="text-3xl text-gray-300">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col p-3">
            {editingId === t.id ? (
              <input
                className="mb-1 rounded border border-primary px-2 py-1 text-sm font-medium outline-none"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleRename(t.id, editTitle)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(t.id, editTitle);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
              />
            ) : (
              <h3
                className="mb-1 truncate text-sm font-semibold text-text-primary cursor-pointer hover:text-primary"
                onDoubleClick={() => { setEditingId(t.id); setEditTitle(t.title); }}
                title="Double-click to rename"
              >
                {t.title}
              </h3>
            )}
            {t.description && (
              <p className="mb-2 line-clamp-2 text-xs text-text-muted">{t.description}</p>
            )}
            <div className="mt-auto flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS.general}`}>
                {t.category}
              </span>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-text-muted ring-1 ring-inset ring-border">
                {scopeLabel(t)}
              </span>
              {t.usageCount > 0 && (
                <span className="text-[10px] text-text-muted">Used {t.usageCount}x</span>
              )}
            </div>
          </div>

          {/* Hover actions */}
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => handleUse(t)}
              className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-primary-hover"
              title="Create diagram from template"
            >
              Use
            </button>
            <button
              onClick={() => handleDelete(t.id)}
              className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-error shadow-sm ring-1 ring-border transition hover:bg-error/5"
              title="Delete template"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
