import type { Tag } from "@/api/tags";
import { DiagramGrid, type DiagramActions } from "./DiagramGrid";
import { NewDiagramCard } from "./NewDiagramCard";

type Diagram = { id: string; title: string; folderId: string | null; thumbnail: string | null; starred?: boolean; tags?: Tag[]; updatedAt?: string; updated_at?: string };
type Folder = { id: string; name: string };

type FolderSectionProps = DiagramActions & {
  title: string;
  icon?: boolean;
  diagrams: Diagram[];
  folders: Folder[];
  allTags: Tag[];
  viewMode: "grid" | "list";
  actionPending: boolean;
  onCreateDiagram: () => void;
  onDeleteFolder?: () => void;
};

export function FolderSection({ title, icon, diagrams, folders, allTags, viewMode, actionPending, onCreateDiagram, onDeleteFolder, ...actions }: FolderSectionProps) {
  const newCard = <NewDiagramCard onClick={onCreateDiagram} disabled={actionPending} />;

  return (
    <div className="mb-10">
      <div className="group mb-4 flex items-center gap-3 border-b border-border pb-2">
        {icon && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-muted"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
        )}
        <h3 className="flex-1 text-xs font-bold uppercase tracking-wider text-text-muted">{title}</h3>
        <button
          onClick={onCreateDiagram}
          disabled={actionPending}
          className="shrink-0 rounded p-1 text-text-muted transition hover:bg-primary/10 hover:text-primary"
          title={`New diagram in ${title}`}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        {onDeleteFolder && (
          <button
            onClick={onDeleteFolder}
            className="shrink-0 rounded p-1 text-text-muted transition hover:bg-red-500/10 hover:text-red-600"
            title="Delete folder"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
        )}
      </div>
      {diagrams.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {newCard}
        </div>
      ) : (
        <DiagramGrid
          diagrams={diagrams}
          folders={folders}
          allTags={allTags}
          viewMode={viewMode}
          appendToGrid={newCard}
          {...actions}
        />
      )}
    </div>
  );
}
