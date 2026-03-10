import { FormEvent, useState } from "react";
import type { CommentThread, ExcalidrawElement } from "@/lib/types";

type CommentsPanelProps = {
  threads: CommentThread[];
  elements: readonly unknown[];
  selectedElementId: string | null;
  onCreateThread: (elementId: string, body: string) => Promise<void>;
  onReply: (threadId: string, body: string) => Promise<void>;
  onResolve: (threadId: string, resolved: boolean) => Promise<void>;
  onDelete: (threadId: string) => Promise<void>;
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

function elementExists(elements: readonly unknown[], elementId: string): boolean {
  return (elements as ExcalidrawElement[]).some((e) => e.id === elementId);
}

export function CommentsPanel({
  threads,
  elements,
  selectedElementId,
  onCreateThread,
  onReply,
  onResolve,
  onDelete,
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
    if (!selectedElementId || !newBody.trim()) return;
    setPending(true);
    try {
      await onCreateThread(selectedElementId, newBody.trim());
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

  return (
    <div className="pointer-events-auto flex h-full w-80 flex-col border-l border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 border-b border-gray-100 px-4 py-2">
        {(["open", "resolved", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
              filter === f ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* New comment form */}
      {selectedElementId && (
        <form onSubmit={handleCreate} className="border-b border-gray-100 px-4 py-3">
          <p className="mb-2 text-xs text-gray-500">
            Comment on selected element
          </p>
          <textarea
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            rows={2}
            placeholder="Add a comment..."
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
          />
          <button
            type="submit"
            disabled={pending || !newBody.trim()}
            className="mt-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Comment
          </button>
        </form>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-xs text-gray-400">
            {filter === "open" ? "No open comments" : filter === "resolved" ? "No resolved comments" : "No comments yet"}
          </div>
        )}
        {filtered.map((thread) => {
          const exists = elementExists(elements, thread.elementId);
          return (
            <div key={thread.id} className={`border-b border-gray-100 px-4 py-3 ${thread.resolved ? "opacity-60" : ""}`}>
              {/* Thread header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-900">{thread.authorName}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(thread.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{thread.body}</p>
                  {!exists && (
                    <p className="mt-1 text-[10px] italic text-amber-500">Element removed</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {exists && (
                    <button
                      onClick={() => onHighlightElement(thread.elementId)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Focus element"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                  )}
                  <button
                    onClick={() => onResolve(thread.id, !thread.resolved)}
                    className={`rounded p-1 hover:bg-gray-100 ${thread.resolved ? "text-green-500" : "text-gray-400 hover:text-green-500"}`}
                    title={thread.resolved ? "Unresolve" : "Resolve"}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7l2.5 2.5L10.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button
                    onClick={() => onDelete(thread.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>

              {/* Replies */}
              {thread.replies.length > 0 && (
                <div className="mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                  {thread.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900">{reply.authorName}</span>
                        <span className="text-[10px] text-gray-400">{timeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{reply.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyingTo === thread.id ? (
                <form onSubmit={(e) => handleReply(e, thread.id)} className="mt-2">
                  <textarea
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-blue-400"
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
                      className="rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => { setReplyingTo(null); setReplyBody(""); }}
                      className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setReplyingTo(thread.id)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  Reply
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
