import { useState } from "react";
import { diagramsApi } from "@/api/diagrams";
import { shareApi } from "@/api/share";
import { foldersApi } from "@/api/folders";
import { templatesApi } from "@/api/templates";
import { isValidExcalidrawFile } from "@/lib/diagram-filters";
import type { Diagram } from "./useDashboardData";

type ToastFn = (msg: string, type?: "success" | "error" | "info") => void;
type ConfirmFn = (opts: { title: string; message: string; confirmLabel?: string; variant?: "default" | "danger" }) => Promise<boolean>;

export interface UseDiagramActionsParams {
  navigate: (path: string) => void;
  toast: ToastFn;
  confirm: ConfirmFn;
  loadData: () => void;
  setDiagrams: React.Dispatch<React.SetStateAction<Diagram[]>>;
  diagrams: Diagram[];
  folderId: string | null | undefined;
  activeWorkspaceId: string | null;
}

export function useDiagramActions({
  navigate, toast, confirm, loadData, setDiagrams, diagrams,
  folderId, activeWorkspaceId,
}: UseDiagramActionsParams) {
  const [actionPending, setActionPending] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templatePickerFolderId, setTemplatePickerFolderId] = useState<string | undefined>(undefined);

  function openTemplatePicker(targetFolderId?: string) {
    setTemplatePickerFolderId(targetFolderId);
    setTemplatePickerOpen(true);
  }

  async function createBlankDiagram() {
    setTemplatePickerOpen(false);
    setActionPending(true);
    try {
      const payload = await diagramsApi.create({ title: "Untitled", folderId: templatePickerFolderId ?? folderId ?? undefined, workspaceId: activeWorkspaceId ?? undefined });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else { toast("Diagram created, but missing id.", "info"); loadData(); }
    } catch { toast("Could not create diagram.", "error"); }
    finally { setActionPending(false); }
  }

  async function createFromBuiltIn(template: { name: string; elements: unknown[]; appState: Record<string, unknown> }) {
    setTemplatePickerOpen(false);
    setActionPending(true);
    try {
      const payload = await diagramsApi.create({
        title: template.name,
        folderId: templatePickerFolderId ?? folderId ?? undefined,
        workspaceId: activeWorkspaceId ?? undefined,
        elements: template.elements,
      });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else { toast("Diagram created, but missing id.", "info"); loadData(); }
    } catch { toast("Could not create diagram.", "error"); }
    finally { setActionPending(false); }
  }

  async function createFromTemplate(templateId: string, title: string) {
    setTemplatePickerOpen(false);
    setActionPending(true);
    try {
      const payload = await templatesApi.use(templateId, {
        title,
        folderId: templatePickerFolderId ?? folderId ?? undefined,
        workspaceId: activeWorkspaceId ?? undefined,
      });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else { toast("Diagram created, but missing id.", "info"); loadData(); }
    } catch { toast("Could not create diagram.", "error"); }
    finally { setActionPending(false); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setActionPending(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!isValidExcalidrawFile(data)) {
        toast("Invalid .excalidraw file.", "error");
        setActionPending(false);
        return;
      }
      const title = file.name.replace(/\.(excalidraw|json)$/i, "") || "Imported";
      const payload = await diagramsApi.create({ title, folderId: folderId ?? undefined, workspaceId: activeWorkspaceId ?? undefined, elements: data.elements });
      const id = payload.diagram?.id;
      if (id) navigate(`/board/${id}`);
      else { toast("Imported, but missing id.", "info"); loadData(); }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 413) toast("File is too large to import. Try a smaller diagram.", "error");
      else toast("Could not read file.", "error");
    }
    finally { setActionPending(false); }
  }

  async function moveDiagram(diagramId: string, targetFolderId: string | null, workspaceId?: string) {
    try { await diagramsApi.move(diagramId, targetFolderId, workspaceId); loadData(); } catch { /* silent */ }
  }

  async function deleteDiagram(diagramId: string, title: string) {
    const ok = await confirm({
      title: "Delete Diagram",
      message: `"${title || "Untitled"}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await diagramsApi.delete(diagramId);
      toast("Diagram deleted");
      loadData();
    } catch { toast("Failed to delete diagram.", "error"); }
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
      toast("Embed code copied!");
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

  async function saveAsTemplate(diagramId: string, title: string) {
    try {
      const data = await diagramsApi.get(diagramId);
      const d = data.diagram ?? data;
      await templatesApi.create({
        title: `${title} Template`,
        elements: d.elements ?? [],
        appState: d.appState ?? d.app_state ?? {},
        workspaceId: activeWorkspaceId,
        thumbnail: d.thumbnail ?? null,
      });
      toast("Template saved!");
    } catch { toast("Could not save template.", "error"); }
  }

  async function createFolder(name: string) {
    if (!name.trim()) return;
    try {
      await foldersApi.create(name.trim(), activeWorkspaceId ?? undefined);
      loadData();
    } catch { /* silent */ }
  }

  async function deleteFolder(id: string, setSearchParams: (p: Record<string, string>) => void) {
    const hasDiagrams = diagrams.some((d) => d.folderId === id);
    if (hasDiagrams) {
      toast("Cannot delete this folder because it still contains diagrams. Move or delete them first.", "error");
      return;
    }
    const ok = await confirm({
      title: "Delete Folder",
      message: "This folder will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await foldersApi.delete(id);
      if (folderId === id) setSearchParams({});
      toast("Folder deleted");
      loadData();
    } catch { toast("Failed to delete folder.", "error"); }
  }

  const diagramActions = {
    onMove: moveDiagram,
    onDelete: deleteDiagram,
    onDuplicate: duplicateDiagram,
    onToggleStar: toggleStar,
    onEmbed: embedDiagram,
    onRename: renameDiagram,
    onSaveAsTemplate: saveAsTemplate,
  };

  return {
    actionPending,
    templatePickerOpen, setTemplatePickerOpen,
    openTemplatePicker,
    createBlankDiagram, createFromBuiltIn, createFromTemplate,
    handleImport,
    createFolder, deleteFolder,
    diagramActions,
  };
}
