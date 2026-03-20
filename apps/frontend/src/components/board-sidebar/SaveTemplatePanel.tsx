import { useEffect, useState } from "react";
import { templatesApi } from "@/api/templates";
import { workspacesApi } from "@/api/workspaces";
import type { ExcalidrawApi } from "@/lib/types";
import { ui } from "@/lib/ui";

type SaveTemplatePanelProps = {
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  workspaceId?: string | null;
};

const CATEGORIES = [
  { value: "architecture", label: "Architecture" },
  { value: "database", label: "Database" },
  { value: "agile", label: "Agile" },
  { value: "process", label: "Process" },
  { value: "general", label: "General" },
];

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function SaveTemplatePanel({ excalidrawApiRef, workspaceId }: SaveTemplatePanelProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [shareWithWorkspace, setShareWithWorkspace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsName, setWsName] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    workspacesApi.get(workspaceId).then((res) => {
      const ws = res.workspace ?? res;
      setWsName(ws.isPersonal ? "Personal" : ws.name);
    }).catch(() => {});
  }, [workspaceId]);

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    const api = excalidrawApiRef.current;
    if (!api) {
      setError("Editor not available");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const elements = api.getSceneElements();
      const appState = api.getAppState();

      // Capture thumbnail from the canvas
      let thumbnail: string | null = null;
      try {
        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({
          elements: elements as Parameters<typeof exportToBlob>[0]["elements"],
          appState: { ...appState, exportWithDarkMode: false },
          files: null,
          maxWidthOrHeight: 300,
        });
        thumbnail = await blobToDataUrl(blob);
      } catch { /* thumbnail is optional */ }

      await templatesApi.create({
        title: title.trim(),
        description: description.trim(),
        category,
        workspaceId: shareWithWorkspace && workspaceId ? workspaceId : undefined,
        elements: elements as unknown[],
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        },
        thumbnail,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setTitle("");
      setDescription("");
      setCategory("general");
      setShareWithWorkspace(false);
    } catch {
      setError("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className={ui.h2}>Save as Template</h3>
      <p className="text-xs text-text-muted">Save the current canvas as a reusable template.</p>

      <label className={ui.label}>
        <span>Title</span>
        <input
          className={ui.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. My Architecture Template"
        />
      </label>

      <label className={ui.label}>
        <span>Description</span>
        <textarea
          className={`${ui.input} h-20 resize-none py-2`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this template"
        />
      </label>

      <label className={ui.label}>
        <span>Category</span>
        <select
          className={ui.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      {workspaceId && (
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={shareWithWorkspace}
            onChange={(e) => setShareWithWorkspace(e.target.checked)}
            className="rounded border-border"
          />
          <span>Share with {wsName || "workspace members"}</span>
        </label>
      )}

      {error && <p className={ui.alertError}>{error}</p>}
      {saved && <p className={ui.alertSuccess}>Template saved!</p>}

      <button
        type="button"
        className={`${ui.btn} ${ui.btnPrimary} w-full`}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Template"}
      </button>
    </div>
  );
}
