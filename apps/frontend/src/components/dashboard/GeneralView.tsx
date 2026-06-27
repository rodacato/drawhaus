import type { Tag } from "@/api/tags";
import type { DiagramActions } from "./DiagramGrid";
import { DiagramGrid } from "./DiagramGrid";
import { ui } from "@/lib/ui";
import type { Diagram } from "@/components/shared/DiagramTypes";

type Folder = { id: string; name: string };

type WorkspaceOption = { id: string; name: string; isPersonal: boolean };

type GeneralViewProps = DiagramActions & {
  diagrams: Diagram[];
  folders: Folder[];
  allTags: Tag[];
  viewMode: "grid" | "list";
  emptyMessage: string;
  workspaces?: WorkspaceOption[];
  activeWorkspaceId?: string | null;
};

export function GeneralView({ diagrams, folders, allTags, viewMode, emptyMessage, workspaces, activeWorkspaceId, ...actions }: GeneralViewProps) {
  if (diagrams.length === 0) {
    return <div className={ui.empty}>{emptyMessage}</div>;
  }

  return (
    <DiagramGrid
      diagrams={diagrams}
      folders={folders}
      allTags={allTags}
      viewMode={viewMode}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      {...actions}
    />
  );
}
