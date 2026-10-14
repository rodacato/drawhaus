import { useCallback, useEffect, useRef, useState } from "react";
import type { PresenceUserWithSelf } from "@/lib/types";

export function BoardToolbarTrigger({
  open,
  onToggle,
  userCount,
}: {
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly userCount: number;
}) {
  return (
    <button
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 text-xs font-medium shadow-sm transition ${
        open
          ? "bg-primary text-on-primary"
          : "bg-surface-raised/90 text-text-primary hover:bg-selection"
      }`}
      title="Collaboration menu"
      type="button"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
      {userCount} online
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform ${open ? "rotate-180" : ""}`}
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

export function BoardToolbarPanel({
  presenceUsers,
  followingUserId,
  onFollow,
  onCreateShareLink,
  showShare = true,
  onClose,
  raisedHands,
}: {
  readonly presenceUsers: PresenceUserWithSelf[];
  readonly followingUserId: string | null;
  readonly onFollow: (userId: string | null) => void;
  readonly onCreateShareLink: (role: "viewer" | "editor") => Promise<string | null>;
  readonly showShare?: boolean;
  readonly onClose: () => void;
  readonly raisedHands?: Set<string>;
}) {
  const [tab, setTab] = useState<"collab" | "share">("collab");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      globalThis.addEventListener("mousedown", onClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      globalThis.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  const handleShare = useCallback(
    async (role: "viewer" | "editor") => {
      setShareLoading(true);
      setShareCopied(false);
      setShareError(null);
      try {
        const url = await onCreateShareLink(role);
        if (url) {
          setShareUrl(url);
          await navigator.clipboard.writeText(url);
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
        } else {
          setShareError("Failed to create link. Check you have permission.");
        }
      } catch {
        setShareError("Something went wrong creating the link.");
      } finally {
        setShareLoading(false);
      }
    },
    [onCreateShareLink],
  );

  const selfUser = presenceUsers.find((u) => u.isSelf);
  const otherUsers = presenceUsers.filter((u) => !u.isSelf);

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full mt-2 z-30 w-80 rounded-2xl bg-surface-raised shadow-2xl border border-border overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab("collab")}
          className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
            tab === "collab"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
          type="button"
        >
          Collaborate
        </button>
        {showShare && (
          <button
            onClick={() => setTab("share")}
            className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition ${
              tab === "share"
                ? "text-primary border-b-2 border-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
            type="button"
          >
            Share
          </button>
        )}
      </div>

      {/* Collaborate tab */}
      {tab === "collab" && (
        <div className="p-4 space-y-1 max-h-80 overflow-y-auto">
          {selfUser && (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-selection">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600">
                {(selfUser.name || "?")[0].toUpperCase()}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">{selfUser.name}</p>
                <p className="text-[10px] text-text-muted">You</p>
              </div>
            </div>
          )}

          {otherUsers.map((user) => {
            const isFollowing = followingUserId === user.userId;
            return (
              <div
                key={user.userId}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-selection transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-selection text-xs font-bold text-primary">
                    {(user.name || "?")[0].toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {user.name}
                      {raisedHands?.has(user.userId) && (
                        <span className="ml-1" title="Mano levantada">
                          ✋
                        </span>
                      )}
                    </p>
                    {user.isGuest && <p className="text-[10px] text-text-muted">Guest</p>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onFollow(isFollowing ? null : user.userId);
                    if (!isFollowing) onClose();
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    isFollowing
                      ? "bg-primary text-on-primary hover:bg-primary-hover"
                      : "bg-selection text-text-secondary hover:bg-selection hover:text-primary"
                  }`}
                  type="button"
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            );
          })}

          {otherUsers.length === 0 && (
            <div className="rounded-xl bg-selection px-4 py-4 text-center mt-2">
              <p className="text-sm text-text-muted">No one else is here yet</p>
              {showShare && (
                <p className="mt-1 text-xs text-text-muted">Share a link to invite collaborators</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Share tab */}
      {tab === "share" && showShare && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-text-muted">
            Create a link to share this diagram with anyone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleShare("viewer")}
              disabled={shareLoading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-selection text-sm font-medium text-text-secondary transition hover:bg-selection disabled:opacity-50"
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View only
            </button>
            <button
              onClick={() => handleShare("editor")}
              disabled={shareLoading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-selection text-sm font-medium text-primary transition hover:bg-selection disabled:opacity-50"
              type="button"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Can edit
            </button>
          </div>
          {shareError && <p className="text-xs font-medium text-red-600">{shareError}</p>}
          {shareUrl && (
            <div className="rounded-xl bg-selection p-3 space-y-1.5">
              <p className="break-all text-xs text-text-muted font-mono">{shareUrl}</p>
              <p
                className={`text-xs font-medium ${shareCopied ? "text-emerald-600" : "text-text-muted"}`}
              >
                {shareCopied ? "Copied to clipboard!" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FollowingBanner({
  presenceUsers,
  followingUserId,
  onStop,
}: {
  readonly presenceUsers: PresenceUserWithSelf[];
  readonly followingUserId: string;
  readonly onStop: () => void;
}) {
  const user = presenceUsers.find((u) => u.userId === followingUserId);
  return (
    <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 flex items-center gap-3 rounded-full bg-primary px-4 py-2 text-on-primary shadow-lg">
      <span className="flex h-2 w-2 rounded-full bg-on-primary animate-pulse" />
      <span className="text-sm font-medium">Following {user?.name ?? "user"}</span>
      <button
        onClick={onStop}
        className="ml-1 rounded-full bg-on-primary/20 px-2 py-0.5 text-xs font-medium hover:bg-on-primary/30 transition"
        type="button"
      >
        Stop
      </button>
    </div>
  );
}
