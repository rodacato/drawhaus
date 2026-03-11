import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Tag } from "@/api/tags";
import { useInlineRename } from "@/hooks/useInlineRename";

type Diagram = {
  id: string;
  title: string;
  folderId: string | null;
  thumbnail: string | null;
  starred?: boolean;
  tags?: Tag[];
  updatedAt?: string;
  updated_at?: string;
};
type Folder = { id: string; name: string };

const TAG_COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

export interface DiagramCardProps {
  diagram: Diagram;
  folders: Folder[];
  allTags: Tag[];
  onMove: (id: string, folderId: string | null) => void;
  onDelete: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStar: (id: string, starred: boolean) => void;
  onShare: (id: string) => void;
  onEmbed: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onToggleTag: (diagramId: string, tag: Tag) => void;
  onCreateTag: (name: string, color: string) => Promise<Tag | null>;
  onDeleteTag: (tagId: string) => void;
}

export function DiagramCard({
  diagram,
  folders,
  allTags,
  onMove,
  onDelete,
  onDuplicate,
  onToggleStar,
  onShare,
  onEmbed,
  onRename,
  onToggleTag,
  onCreateTag,
  onDeleteTag,
}: DiagramCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveSubOpen, setMoveSubOpen] = useState(false);
  const [tagsSubOpen, setTagsSubOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const {
    renaming,
    renameValue,
    setRenameValue,
    startRenaming,
    commitRename,
    handleKeyDown,
    handleSubmit,
  } = useInlineRename(diagram.title, onRename, diagram.id);

  const moveOptions = [{ id: null as string | null, name: "Unfiled" }, ...folders].filter((f) => f.id !== diagram.folderId);

  function toggleMenu() {
    if (!menuOpen && menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 176 });
    }
    setMenuOpen(!menuOpen);
    setMoveSubOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
    setMoveSubOpen(false);
    setTagsSubOpen(false);
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-surface-raised transition-all hover:shadow-xl hover:border-primary/30">
      <Link to={`/board/${diagram.id}`} className="block overflow-hidden">
        <div className="aspect-video relative bg-surface overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-40 transition-opacity group-hover:opacity-60" />
          {diagram.thumbnail ? (
            <img src={diagram.thumbnail} alt={diagram.title || "Untitled"} className="h-full w-full object-contain" />
          ) : (
            <div className="absolute inset-4 flex items-center justify-center rounded-lg border-2 border-dashed border-border">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted/40"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </div>
          )}
        </div>
      </Link>

      {/* Three-dot more button — top-right on hover */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          ref={menuBtnRef}
          onClick={toggleMenu}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-dark/80 text-white shadow-md transition hover:bg-surface-dark"
          title="More actions"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
        </button>
      </div>

      {/* Three-dot dropdown menu */}
      {menuOpen && menuPos && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeMenu} />
          <div className="fixed z-50 w-44 rounded-lg border border-border bg-surface-raised py-1 shadow-xl" style={{ top: menuPos.top, left: menuPos.left }}>
            {/* Rename */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface" type="button" onClick={() => { closeMenu(); startRenaming(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
              Rename
            </button>

            {/* Tags — with sub-menu */}
            <div className="relative">
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface"
                type="button"
                onClick={() => { setTagsSubOpen(!tagsSubOpen); setMoveSubOpen(false); }}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                  Tags
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              {tagsSubOpen && (
                <div className="absolute left-full top-0 ml-1 w-48 rounded-lg border border-border bg-surface-raised py-1 shadow-xl">
                  {allTags.map((tag) => {
                    const assigned = diagram.tags?.some((t) => t.id === tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => onToggleTag(diagram.id, tag)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface"
                        type="button"
                      >
                        <span className="flex h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span className="flex-1 truncate">{tag.name}</span>
                        {assigned && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </button>
                    );
                  })}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newTagName.trim()) return;
                      const tag = await onCreateTag(newTagName.trim(), TAG_COLORS[allTags.length % TAG_COLORS.length]);
                      if (tag) { onToggleTag(diagram.id, tag); setNewTagName(""); }
                    }}
                    className="border-t border-border px-2 pt-1.5 pb-1"
                  >
                    <input
                      className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-primary"
                      placeholder="New tag..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                    />
                  </form>
                </div>
              )}
            </div>

            {/* Share */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface" type="button" onClick={() => { closeMenu(); onShare(diagram.id); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
              Share
            </button>

            {/* Embed */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface" type="button" onClick={() => { closeMenu(); onEmbed(diagram.id); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
              Embed
            </button>

            {/* Move — with sub-menu */}
            <div className="relative">
              <button
                className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface"
                type="button"
                onClick={() => setMoveSubOpen(!moveSubOpen)}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                  Move
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              {moveSubOpen && moveOptions.length > 0 && (
                <div className="absolute left-full top-0 ml-1 w-40 rounded-lg border border-border bg-surface-raised py-1 shadow-xl">
                  {moveOptions.map((opt) => (
                    <button
                      key={opt.id ?? "unfiled"}
                      onClick={() => { closeMenu(); onMove(diagram.id, opt.id); }}
                      className="w-full px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface"
                      type="button"
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Duplicate */}
            <button className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary transition hover:bg-surface" type="button" onClick={() => { closeMenu(); onDuplicate(diagram.id); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
              Duplicate
            </button>

            {/* Delete */}
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-500 transition hover:bg-red-500/10"
              type="button"
              onClick={() => { closeMenu(); onDelete(diagram.id, diagram.title); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              Delete
            </button>
          </div>
        </>
      )}

      {/* Card footer */}
      <div className="flex items-start justify-between p-4">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form onSubmit={handleSubmit} className="flex">
              <input
                className="w-full rounded border border-primary bg-surface px-1.5 py-0.5 text-sm font-semibold text-text-primary outline-none"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </form>
          ) : (
            <h2
              className="cursor-text truncate text-sm font-semibold text-text-primary"
              onDoubleClick={startRenaming}
              title="Double-click to rename"
            >
              {diagram.title || "Untitled"}
            </h2>
          )}
          {diagram.tags && diagram.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {diagram.tags.map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-text-secondary">{new Date(diagram.updatedAt ?? diagram.updated_at ?? "").toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pl-2">
          {/* Star button */}
          <button
            onClick={() => onToggleStar(diagram.id, !diagram.starred)}
            className={`rounded p-0.5 transition ${diagram.starred ? "text-yellow-500" : "text-text-muted hover:text-yellow-500"}`}
            title={diagram.starred ? "Unstar" : "Star"}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={diagram.starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}
