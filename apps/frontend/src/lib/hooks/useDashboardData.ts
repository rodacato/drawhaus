import { useCallback, useEffect, useState } from "react";
import { diagramsApi } from "@/api/diagrams";
import { foldersApi } from "@/api/folders";
import { tagsApi, type Tag } from "@/api/tags";
import { workspacesApi, type Workspace } from "@/api/workspaces";
import { sortByUpdated, filterStarred } from "@/lib/diagram-filters";

export type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; starred?: boolean; tags?: Tag[]; updatedAt?: string; updated_at?: string };
export type Folder = { id: string; name: string };
export type SidebarView = "all" | "recent" | "starred" | "unfiled" | "folder" | "templates";

export interface UseDashboardDataParams {
  sidebarView: SidebarView;
  folderId: string | null | undefined;
  searchQuery: string;
}

export function useDashboardData({ sidebarView, folderId, searchQuery }: UseDashboardDataParams) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => localStorage.getItem("drawhaus_workspace"));

  // Load workspaces on mount
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

  // Load data
  const isGlobalView = sidebarView === "recent" || sidebarView === "starred" || sidebarView === "templates";

  const loadData = useCallback(async () => {
    if (!activeWorkspaceId && !isGlobalView) return;
    try {
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

  // Derived data
  const isRecent = sidebarView === "recent";
  const isStarred = sidebarView === "starred";
  const isTemplates = sidebarView === "templates";
  const isWorkspaceView = sidebarView === "all";

  const displayDiagrams = (() => {
    if (isRecent) return sortByUpdated(diagrams).slice(0, 10);
    if (isStarred) return filterStarred(diagrams);
    return diagrams;
  })();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const heading = searchQuery
    ? `Search: "${searchQuery}"`
    : isRecent ? "Recent"
    : isStarred ? "Starred"
    : isTemplates ? "My Templates"
    : activeWorkspace ? (activeWorkspace.isPersonal ? "Personal" : activeWorkspace.name)
    : "Diagrams";

  const subtitle = searchQuery
    ? `${displayDiagrams.length} result${displayDiagrams.length !== 1 ? "s" : ""}`
    : isRecent ? "Recently edited diagrams"
    : isStarred ? "Your starred diagrams"
    : isTemplates ? "Your saved templates — double-click to rename"
    : isWorkspaceView && activeWorkspace
      ? (activeWorkspace.isPersonal ? "Personal workspace" : `${activeWorkspace.name} workspace`)
      : "Manage and organize your visual workflows";

  return {
    diagrams, setDiagrams,
    folders,
    allTags, setAllTags,
    workspaces, setWorkspaces,
    activeWorkspaceId, setActiveWorkspaceId,
    loading, loadData,
    displayDiagrams, activeWorkspace,
    heading, subtitle,
    isRecent, isStarred, isTemplates, isWorkspaceView,
  };
}
