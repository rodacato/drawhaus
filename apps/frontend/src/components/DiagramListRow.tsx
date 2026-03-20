import { Link } from "react-router-dom";
import { useInlineRename } from "@/lib/hooks/useInlineRename";
import type { Diagram } from "./shared/DiagramTypes";
import { TagBadges } from "./shared/TagBadges";

export interface DiagramListRowProps {
  diagram: Diagram;
  onRename: (id: string, title: string) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onShare: (id: string) => void;
  onEmbed: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}

export function DiagramListRow({
  diagram,
  onRename,
  onToggleStar,
  onShare,
  onEmbed,
  onDuplicate,
  onDelete,
}: DiagramListRowProps) {
  const {
    renaming,
    renameValue,
    setRenameValue,
    startRenaming,
    commitRename,
    handleKeyDown,
    handleSubmit,
  } = useInlineRename(diagram.title, onRename, diagram.id);

  return (
    <div className="group flex items-center gap-4 px-4 py-3 transition hover:bg-surface-raised">
      <Link to={`/board/${diagram.id}`} className="block h-12 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
        {diagram.thumbnail ? (
          <img src={diagram.thumbnail} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-text-muted">—</div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        {renaming ? (
          <form onSubmit={handleSubmit} className="flex">
            <input
              className="w-full rounded border border-primary bg-surface px-1.5 py-0.5 text-sm font-medium text-text-primary outline-none"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </form>
        ) : (
          <p
            className="cursor-text truncate text-sm font-medium text-text-primary"
            onDoubleClick={startRenaming}
            title="Double-click to rename"
          >
            {diagram.title || "Untitled"}
          </p>
        )}
        <div className="flex items-center gap-2">
          {diagram.tags && diagram.tags.length > 0 && (
            <TagBadges tags={diagram.tags} />
          )}
          <p className="text-xs text-text-muted">{new Date(diagram.updatedAt ?? diagram.updated_at ?? "").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>

      <button
        onClick={() => onToggleStar(diagram.id, !diagram.starred)}
        className={`shrink-0 rounded p-1 transition ${diagram.starred ? "text-yellow-500" : "text-text-muted opacity-0 group-hover:opacity-100"} hover:text-yellow-500`}
        title={diagram.starred ? "Unstar" : "Star"}
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={diagram.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
      </button>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={startRenaming} className="rounded p-1 text-text-muted hover:text-primary" title="Rename" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
        </button>
        <button onClick={() => onShare(diagram.id)} className="rounded p-1 text-text-muted hover:text-primary" title="Share" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
        </button>
        <button onClick={() => onEmbed(diagram.id)} className="rounded p-1 text-text-muted hover:text-primary" title="Embed" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
        </button>
        <button onClick={() => onDuplicate(diagram.id)} className="rounded p-1 text-text-muted hover:text-primary" title="Duplicate" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        </button>
        <button onClick={() => onDelete(diagram.id, diagram.title)} className="rounded p-1 text-text-muted hover:text-red-500" title="Delete" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
        </button>
      </div>
    </div>
  );
}
