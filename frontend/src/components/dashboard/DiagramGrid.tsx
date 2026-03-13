import type { Tag } from "@/api/tags";
import { DiagramCard } from "@/components/DiagramCard";
import { DiagramListRow } from "@/components/DiagramListRow";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; starred?: boolean; tags?: Tag[]; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };

export type DiagramActions = {
  onMove: (diagramId: string, folderId: string | null) => void;
  onDelete: (diagramId: string, title: string) => void;
  onDuplicate: (diagramId: string) => void;
  onToggleStar: (diagramId: string, starred: boolean) => void;
  onShare: (diagramId: string) => void;
  onEmbed: (diagramId: string) => void;
  onRename: (diagramId: string, title: string) => void;
  onToggleTag: (diagramId: string, tag: Tag) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
  onDeleteTag: (tagId: string) => void;
  onSaveAsTemplate?: (diagramId: string, title: string) => void;
};

type DiagramGridProps = DiagramActions & {
  diagrams: Diagram[];
  folders: Folder[];
  allTags: Tag[];
  viewMode: "grid" | "list";
  appendToGrid?: React.ReactNode;
};

export function DiagramGrid({ diagrams, folders, allTags, viewMode, appendToGrid, onMove, onDelete, onDuplicate, onToggleStar, onShare, onEmbed, onRename, onToggleTag, onCreateTag, onDeleteTag, onSaveAsTemplate }: DiagramGridProps) {
  if (viewMode === "list") {
    return (
      <div className="divide-y divide-border rounded-lg border border-border bg-surface-raised">
        {diagrams.map((diagram) => (
          <DiagramListRow key={diagram.id} diagram={diagram} onRename={onRename} onToggleStar={onToggleStar} onShare={onShare} onEmbed={onEmbed} onDuplicate={onDuplicate} onDelete={onDelete} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {diagrams.map((diagram) => (
        <DiagramCard key={diagram.id} diagram={diagram} folders={folders} allTags={allTags} onMove={onMove} onDelete={onDelete} onDuplicate={onDuplicate} onToggleStar={onToggleStar} onShare={(id) => onShare(id)} onEmbed={onEmbed} onRename={onRename} onToggleTag={onToggleTag} onCreateTag={onCreateTag} onDeleteTag={onDeleteTag} onSaveAsTemplate={onSaveAsTemplate} />
      ))}
      {appendToGrid}
    </div>
  );
}
