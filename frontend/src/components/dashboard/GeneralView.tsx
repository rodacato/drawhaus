import type { Tag } from "@/api/tags";
import type { DiagramActions } from "./DiagramGrid";
import { DiagramGrid } from "./DiagramGrid";
import { ui } from "@/lib/ui";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; starred?: boolean; tags?: Tag[]; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };

type GeneralViewProps = DiagramActions & {
  diagrams: Diagram[];
  folders: Folder[];
  allTags: Tag[];
  viewMode: "grid" | "list";
  emptyMessage: string;
};

export function GeneralView({ diagrams, folders, allTags, viewMode, emptyMessage, ...actions }: GeneralViewProps) {
  if (diagrams.length === 0) {
    return <div className={ui.empty}>{emptyMessage}</div>;
  }

  return (
    <DiagramGrid
      diagrams={diagrams}
      folders={folders}
      allTags={allTags}
      viewMode={viewMode}
      {...actions}
    />
  );
}
