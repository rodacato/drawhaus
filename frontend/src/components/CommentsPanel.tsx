import { FormEvent, useState } from "react";
import type { CommentThread, ExcalidrawElement } from "@/lib/types";
import {
  IconFilter,
  IconThumbUp,
  IconReply,
  IconCheck,
  IconPointer,
  IconAtSign,
  IconSmile,
  IconPaperclip,
} from "@/components/Icons";

type CommentsPanelProps = {
  threads: CommentThread[];
  elements: readonly unknown[];
  selectedElementId: string | null;
  showIndicators: boolean;
  onToggleIndicators: () => void;
  onCreateThread: (elementId: string, body: string) => Promise<void>;
  onReply: (threadId: string, body: string) => Promise<void>;
  onResolve: (threadId: string, resolved: boolean) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
  onToggleLike: (threadId: string) => Promise<void>;
  onHighlightElement: (elementId: string) => void;
  onClose: () => void;
};

type Filter = "open" | "resolved" | "all";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function findElement(elements: readonly unknown[], elementId: string): ExcalidrawElement | undefined {
  return (elements as ExcalidrawElement[]).find((e) => e.id === elementId);
}

function elementLabel(el: ExcalidrawElement): string {
  const type = (el.type as string) ?? "element";
  if (type === "text" && "text" in el && typeof el.text === "string") {
    const preview = el.text.slice(0, 30);
    return preview.length < el.text.length ? `"${preview}..."` : `"${preview}"`;
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function shortId(id: string): string {
  return id.slice(0, 4).toUpperCase();
}

export function CommentsPanel({
  threads,
  elements,
  selectedElementId,
  showIndicators,
  onToggleIndicators,
  onCreateThread,
  onReply,
  onResolve,
  onDelete,
  onToggleLike,
  onHighlightElement,
  onClose,
}: CommentsPanelProps) {
  const [filter, setFilter] = useState<Filter>("open");
  const [newBody, setNewBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [pending, setPending] = useState(false);

  const filtered = threads.filter((t) => {
    if (filter === "open") return !t.resolved;
    if (filter === "resolved") return t.resolved;
    return true;
  });

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newBody.trim()) return;
    setPending(true);
    try {
      await onCreateThread(selectedElementId ?? "__general__", newBody.trim());
      setNewBody("");
    } finally {
      setPending(false);
    }
  }

  async function handleReply(e: FormEvent, threadId: string) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setPending(true);
    try {
      await onReply(threadId, replyBody.trim());
      setReplyBody("");
      setReplyingTo(null);
    } finally {
      setPending(false);
    }
  }

  const tabItems: { key: Filter; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="pointer-events-auto flex h-full w-80 flex-col border-l border-border bg-surface shadow-lg">
      {/* Header with filter button */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">Comments</h2>
        <div className="flex items-center gap-1.5">
          <button
            className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text-secondary"
            title="Filter comments"
          >
            <IconFilter />
          </button>
          <button
            onClick={onToggleIndicators}
            className={`rounded p-1 transition ${showIndicators ? "text-primary hover:bg-primary/10" : "text-text-muted hover:bg-surface-raised hover:text-text-secondary"}`}
            title={showIndicators ? "Hide indicators on canvas" : "Show indicators on canvas"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              {showIndicators ? (
                <>
                  <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                </>
              ) : (
                <>
                  <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </>
              )}
            </svg>
          </button>
          <button onClick={onClose} className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text-secondary" title="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* Comment Tabs */}
      <div className="flex border-b border-border">
        {tabItems.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 border-b-2 px-3 py-2 text-xs font-medium transition ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Enhanced comment input */}
      <form onSubmit={handleCreate} className="border-b border-border px-4 py-3">
        <p className="mb-2 text-xs text-text-muted">
          {selectedElementId
            ? (() => { const sel = findElement(elements, selectedElementId); return sel ? `Comment on: ${elementLabel(sel)}` : "Comment on selected element"; })()
            : "General comment"}
        </p>
        <textarea
          className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary"
          rows={2}
          placeholder="Add a comment..."
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text-secondary"
              title="Mention someone"
            >
              <IconAtSign />
            </button>
            <button
              type="button"
              className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text-secondary"
              title="Add emoji"
            >
              <IconSmile />
            </button>
            <button
              type="button"
              className="rounded p-1 text-text-muted hover:bg-surface-raised hover:text-text-secondary"
              title="Attach file"
            >
              <IconPaperclip />
            </button>
          </div>
          <button
            type="submit"
            disabled={pending || !newBody.trim()}
            className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </form>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-text-muted">
            {filter === "open" ? "No open comments" : filter === "resolved" ? "No resolved comments" : "No comments yet"}
          </div>
        )}
        {filtered.map((thread) => {
          const isGeneral = thread.elementId === "__general__";
          const el = isGeneral ? undefined : findElement(elements, thread.elementId);
          const exists = isGeneral || !!el;
          return (
            <div key={thread.id} className={`border-b border-border px-4 py-3 ${thread.resolved ? "opacity-60" : ""}`}>
              {/* Enhanced comment card */}
              <div className="flex items-start gap-2.5">
                {/* Avatar circle */}
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {thread.authorName.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Author + timestamp */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">{thread.authorName}</span>
                    <span className="text-[10px] text-text-muted">{timeAgo(thread.createdAt)}</span>
                  </div>

                  {/* Element badge */}
                  {!isGeneral && el && (
                    <button
                      onClick={() => onHighlightElement(thread.elementId)}
                      className="mt-1 inline-flex items-center gap-1 rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:text-primary"
                      title="Focus element"
                    >
                      <IconPointer />
                      ON ELEMENT #{shortId(thread.elementId)}
                    </button>
                  )}
                  {isGeneral && (
                    <span className="mt-1 inline-block text-[10px] text-text-muted">General</span>
                  )}

                  {/* Comment text */}
                  <p className="mt-1 text-sm text-text-secondary">{thread.body}</p>

                  {!exists && (
                    <p className="mt-1 text-[10px] italic text-amber-500">Element removed</p>
                  )}

                  {/* Action buttons row */}
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onToggleLike(thread.id)}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${thread.likedByMe ? "text-primary bg-primary/10" : "text-text-muted hover:bg-surface-raised hover:text-text-secondary"}`}
                      title={thread.likedByMe ? "Unlike" : "Like"}
                    >
                      <IconThumbUp />
                      <span>{thread.likeCount || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(thread.id)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-text-muted hover:bg-surface-raised hover:text-text-secondary"
                      title="Reply"
                    >
                      <IconReply />
                      <span>Reply</span>
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => onResolve(thread.id, !thread.resolved)}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-surface-raised ${thread.resolved ? "text-green-500" : "text-text-muted hover:text-green-500"}`}
                      title={thread.resolved ? "Unresolve" : "Resolve"}
                    >
                      <IconCheck />
                      <span>{thread.resolved ? "Resolved" : "Resolve"}</span>
                    </button>
                    <button
                      onClick={() => onDelete(thread.id)}
                      className="rounded p-0.5 text-text-muted hover:bg-surface-raised hover:text-red-500"
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Nested replies */}
              {thread.replies.length > 0 && (
                <div className="mt-3 space-y-3 border-l-2 border-border pl-4">
                  {thread.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-2">
                      {/* Reply avatar */}
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {reply.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary">{reply.authorName}</span>
                          <span className="text-[10px] text-text-muted">{timeAgo(reply.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-text-secondary">{reply.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyingTo === thread.id && (
                <form onSubmit={(e) => handleReply(e, thread.id)} className="mt-3 border-l-2 border-border pl-4">
                  <textarea
                    className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-primary"
                    rows={2}
                    placeholder="Reply..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    autoFocus
                  />
                  <div className="mt-1 flex gap-2">
                    <button
                      type="submit"
                      disabled={pending || !replyBody.trim()}
                      className="rounded bg-primary px-2.5 py-1 text-[10px] font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                      className="rounded px-2 py-1 text-[10px] text-text-muted hover:bg-surface-raised"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
