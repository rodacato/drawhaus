import type { Tag } from "@/api/tags";
import type { DiagramActions } from "./DiagramGrid";
import { FolderSection } from "./FolderSection";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; starred?: boolean; tags?: Tag[]; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };

type WorkspaceViewProps = DiagramActions & {
  diagrams: Diagram[];
  folders: Folder[];
  allTags: Tag[];
  viewMode: "grid" | "list";
  actionPending: boolean;
  onCreateDiagram: (folderId?: string) => void;
  onDeleteFolder: (id: string) => void;
};

export function WorkspaceView({ diagrams, folders, allTags, viewMode, actionPending, onCreateDiagram, onDeleteFolder, ...actions }: WorkspaceViewProps) {
  const unfiled = diagrams.filter((d) => !d.folderId);
  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <FolderSection
        title="Uncategorized"
        diagrams={unfiled}
        folders={folders}
        allTags={allTags}
        viewMode={viewMode}
        actionPending={actionPending}
        onCreateDiagram={() => onCreateDiagram()}
        {...actions}
      />
      {sortedFolders.map((folder) => (
        <FolderSection
          key={folder.id}
          title={folder.name}
          icon
          diagrams={diagrams.filter((d) => d.folderId === folder.id)}
          folders={folders}
          allTags={allTags}
          viewMode={viewMode}
          actionPending={actionPending}
          onCreateDiagram={() => onCreateDiagram(folder.id)}
          onDeleteFolder={() => onDeleteFolder(folder.id)}
          {...actions}
        />
      ))}
    </>
  );
}
