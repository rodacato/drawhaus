import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { templatesApi, type TemplateDTO } from "@/api/templates";
import { builtInTemplates, type BuiltInTemplate } from "@/data/templates";
import { ui } from "@/lib/ui";

type TemplatePickerProps = {
  open: boolean;
  workspaceId?: string | null;
  onClose: () => void;
  onUseTemplate: (templateId: string, title: string) => Promise<void>;
  onUseBuiltIn: (template: BuiltInTemplate) => Promise<void>;
  onBlank: () => void;
};

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "architecture", label: "Architecture" },
  { value: "database", label: "Database" },
  { value: "agile", label: "Agile" },
  { value: "process", label: "Process" },
  { value: "workspace", label: "Workspace" },
  { value: "custom", label: "My Templates" },
];

export function TemplatePicker({ open, workspaceId, onClose, onUseTemplate, onUseBuiltIn, onBlank }: TemplatePickerProps) {
  const [customTemplates, setCustomTemplates] = useState<TemplateDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    templatesApi.list(workspaceId ?? undefined)
      .then((res) => setCustomTemplates(res.templates ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const personalTemplates = customTemplates.filter((t) => !t.workspaceId);
  const workspaceTemplates = customTemplates.filter((t) => !!t.workspaceId);

  const filteredBuiltIn = activeCategory === "all"
    ? builtInTemplates
    : activeCategory === "custom" || activeCategory === "workspace"
      ? []
      : builtInTemplates.filter((t) => t.category === activeCategory);

  const filteredPersonal = activeCategory === "all" || activeCategory === "custom"
    ? personalTemplates
    : activeCategory === "workspace"
      ? []
      : personalTemplates.filter((t) => t.category === activeCategory);

  const filteredWorkspace = activeCategory === "all" || activeCategory === "workspace"
    ? workspaceTemplates
    : activeCategory === "custom"
      ? []
      : workspaceTemplates.filter((t) => t.category === activeCategory);

  async function handleUseBuiltIn(template: BuiltInTemplate) {
    if (pending) return;
    setPending(true);
    try { await onUseBuiltIn(template); } finally { setPending(false); }
  }

  async function handleUseCustom(template: TemplateDTO) {
    if (pending) return;
    setPending(true);
    try { await onUseTemplate(template.id, template.title); } finally { setPending(false); }
  }

  async function handleDelete(e: React.MouseEvent, template: TemplateDTO) {
    e.stopPropagation();
    if (!confirm(`Delete template "${template.title}"?`)) return;
    try {
      await templatesApi.delete(template.id);
      setCustomTemplates((prev) => prev.filter((t) => t.id !== template.id));
    } catch { /* silent */ }
  }

  function CustomTemplateCard({ template }: { template: TemplateDTO }) {
    return (
      <div className="group relative flex min-h-[140px] flex-col rounded-xl border border-border bg-surface text-left transition hover:border-primary/30 hover:shadow-md">
        <button
          type="button"
          onClick={() => handleUseCustom(template)}
          disabled={pending}
          className="flex flex-1 flex-col p-4 disabled:opacity-50"
        >
          {template.thumbnail ? (
            <div className="mb-2 aspect-video w-full overflow-hidden rounded-lg bg-surface-raised">
              <img src={template.thumbnail} alt={template.title} className="h-full w-full object-contain" />
            </div>
          ) : (
            <span className="text-2xl">{template.workspaceId ? "🏢" : "📄"}</span>
          )}
          <span className="mt-2 text-sm font-semibold text-text-primary group-hover:text-primary">{template.title}</span>
          <span className="mt-1 text-xs text-text-muted line-clamp-2">{template.description || "Custom template"}</span>
          <span className="mt-auto flex items-center gap-2 pt-2">
            <span className="inline-block rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-muted">{template.category}</span>
            {template.workspaceId && <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">workspace</span>}
            <span className="text-[10px] text-text-muted">Used {template.usageCount}x</span>
          </span>
        </button>
        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => handleDelete(e, template)}
          className="absolute right-2 top-2 rounded-lg p-1 text-text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
          title="Delete template"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
        </button>
      </div>
    );
  }

  const hasResults = filteredBuiltIn.length > 0 || filteredPersonal.length > 0 || filteredWorkspace.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface-raised shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className={ui.h2}>New Diagram</h2>
            <p className="mt-0.5 text-sm text-text-secondary">Start from a template or blank canvas</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-text-muted transition hover:bg-surface hover:text-text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-border px-6 py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeCategory === cat.value
                  ? "bg-primary/10 text-primary"
                  : "text-text-muted hover:bg-surface hover:text-text-primary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-text-muted">Loading templates...</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {/* Blank canvas card */}
              {activeCategory === "all" && (
                <button
                  type="button"
                  onClick={onBlank}
                  disabled={pending}
                  className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface text-text-muted transition hover:border-primary hover:text-primary hover:shadow-md"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  <span className="mt-2 text-sm font-medium">Blank Canvas</span>
                </button>
              )}

              {/* Built-in templates */}
              {filteredBuiltIn.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleUseBuiltIn(template)}
                  disabled={pending}
                  className="group flex min-h-[140px] flex-col rounded-xl border border-border bg-surface p-4 text-left transition hover:border-primary/30 hover:shadow-md disabled:opacity-50"
                >
                  <span className="text-2xl">{template.icon}</span>
                  <span className="mt-2 text-sm font-semibold text-text-primary group-hover:text-primary">{template.name}</span>
                  <span className="mt-1 text-xs text-text-muted line-clamp-2">{template.description}</span>
                  <span className="mt-auto pt-2">
                    <span className="inline-block rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-muted">{template.category}</span>
                  </span>
                </button>
              ))}

              {/* Workspace templates */}
              {filteredWorkspace.map((template) => (
                <CustomTemplateCard key={template.id} template={template} />
              ))}

              {/* Personal templates */}
              {filteredPersonal.map((template) => (
                <CustomTemplateCard key={template.id} template={template} />
              ))}

              {!hasResults && (
                <div className="col-span-full py-8 text-center text-sm text-text-muted">
                  {activeCategory === "custom" ? "No personal templates yet. Save a diagram as a template from the board sidebar or diagram menu."
                    : activeCategory === "workspace" ? "No workspace templates yet. Share a template with your workspace when saving."
                    : "No templates in this category."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
