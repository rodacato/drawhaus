import { useState } from "react";
import type { PresenceUserWithSelf } from "@/lib/types";

export function SharePanel({
  presenceUsers,
  followingUserId,
  onFollow,
  onCreateShareLink,
}: {
  presenceUsers: PresenceUserWithSelf[];
  followingUserId: string | null;
  onFollow: (userId: string | null) => void;
  onCreateShareLink: (role: "viewer" | "editor") => Promise<string | null>;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [embedSnippet, setEmbedSnippet] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);

  const selfUser = presenceUsers.find((u) => u.isSelf);
  const otherUsers = presenceUsers.filter((u) => !u.isSelf);

  async function handleShare(role: "viewer" | "editor") {
    setShareLoading(true);
    setShareCopied(false);
    try {
      const url = await onCreateShareLink(role);
      if (url) {
        setShareUrl(url);
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch { /* silent */ }
    finally { setShareLoading(false); }
  }

  return (
    <div className="space-y-4">
      {/* Online users */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Online ({presenceUsers.length})
        </h3>
        <div className="space-y-1">
          {selfUser && (
            <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">
                {(selfUser.name || "?")[0].toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{selfUser.name}</p>
                <p className="text-[10px] text-gray-400">You</p>
              </div>
            </div>
          )}
          {otherUsers.map((user) => {
            const isFollowing = followingUserId === user.userId;
            return (
              <div key={user.userId} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-gray-50 transition">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                    {(user.name || "?")[0].toUpperCase()}
                  </span>
                  <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                </div>
                <button
                  onClick={() => onFollow(isFollowing ? null : user.userId)}
                  className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    isFollowing ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"
                  }`}
                  type="button"
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}
          {otherUsers.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">No one else here yet</p>
          )}
        </div>
      </div>

      {/* Share link */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Share link</h3>
        <div className="flex gap-2">
          <button onClick={() => handleShare("viewer")} disabled={shareLoading} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50" type="button">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            View only
          </button>
          <button onClick={() => handleShare("editor")} disabled={shareLoading} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-50 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50" type="button">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Can edit
          </button>
        </div>
        {shareUrl && (
          <div className="mt-2 rounded-lg bg-gray-50 p-2.5">
            <p className="break-all text-[11px] text-gray-500 font-mono">{shareUrl}</p>
            {shareCopied && <p className="mt-1 text-[11px] font-medium text-emerald-600">Copied!</p>}
          </div>
        )}
      </div>

      {/* Embed */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Embed</h3>
        <button
          onClick={async () => {
            setEmbedLoading(true);
            setEmbedCopied(false);
            try {
              const url = await onCreateShareLink("viewer");
              if (url) {
                const embedUrl = url.replace("/share/", "/embed/");
                const snippet = `<iframe src="${embedUrl}" width="100%" height="400" style="border:none;border-radius:8px;" loading="lazy"></iframe>`;
                setEmbedSnippet(snippet);
                await navigator.clipboard.writeText(snippet);
                setEmbedCopied(true);
                setTimeout(() => setEmbedCopied(false), 2000);
              }
            } catch { /* silent */ }
            finally { setEmbedLoading(false); }
          }}
          disabled={embedLoading}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-gray-50 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
          type="button"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
          {embedLoading ? "Generating..." : "Copy embed code"}
        </button>
        {embedSnippet && (
          <div className="mt-2 rounded-lg bg-gray-50 p-2.5">
            <p className="break-all text-[11px] text-gray-500 font-mono">{embedSnippet}</p>
            {embedCopied && <p className="mt-1 text-[11px] font-medium text-emerald-600">Copied!</p>}
          </div>
        )}
      </div>
    </div>
  );
}
