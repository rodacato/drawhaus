import { Link } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { driveApi } from "@/api/drive";
import type { ExcalidrawApi, PresenceUserWithSelf } from "@/lib/types";

/* ───────────────────────── types ───────────────────────── */

type ActivePanel = "export" | "share" | "settings" | null;

type BoardSidebarProps = {
  userEmail: string;
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  // comments
  commentCount: number;
  commentsPanelOpen: boolean;
  onToggleComments: () => void;
  // share / collab
  presenceUsers: PresenceUserWithSelf[];
  followingUserId: string | null;
  onFollow: (userId: string | null) => void;
  onCreateShareLink: (role: "viewer" | "editor") => Promise<string | null>;
  // scenes
  canEdit: boolean;
  onCreateScene: () => void;
};

/* ───────────────────────── icons ───────────────────────── */

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

/* ───────────────────────── sidebar button ───────────────────────── */

function SidebarButton({
  icon,
  label,
  active,
  badge,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-blue-100 text-blue-600"
          : accent
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      }`}
      title={label}
      type="button"
    >
      {icon}
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

/* ───────────────────────── export panel ───────────────────────── */

function ExportPanel({ excalidrawApiRef }: { excalidrawApiRef: React.RefObject<ExcalidrawApi | null> }) {
  const [status, setStatus] = useState<string | null>(null);

  const getSceneData = useCallback(() => {
    const api = excalidrawApiRef.current;
    if (!api) return null;
    return {
      elements: api.getSceneElements() as Parameters<typeof import("@excalidraw/excalidraw")["exportToBlob"]>[0]["elements"],
      appState: api.getAppState() as Parameters<typeof import("@excalidraw/excalidraw")["exportToBlob"]>[0]["appState"],
      files: api.getFiles() as Parameters<typeof import("@excalidraw/excalidraw")["exportToBlob"]>[0]["files"],
    };
  }, [excalidrawApiRef]);

  const download = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  async function handleExport(type: "png" | "svg" | "copy") {
    const data = getSceneData();
    if (!data) return;
    try {
      if (type === "png") {
        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({ elements: data.elements, appState: { ...data.appState, exportWithDarkMode: false }, files: data.files });
        download(blob, "diagram.png");
        setStatus("PNG exported");
      } else if (type === "svg") {
        const { exportToSvg } = await import("@excalidraw/excalidraw");
        const svg = await exportToSvg({ elements: data.elements, appState: { ...data.appState, exportWithDarkMode: false }, files: data.files });
        const svgStr = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgStr], { type: "image/svg+xml" });
        download(blob, "diagram.svg");
        setStatus("SVG exported");
      } else {
        const { exportToBlob } = await import("@excalidraw/excalidraw");
        const blob = await exportToBlob({ elements: data.elements, appState: { ...data.appState, exportWithDarkMode: false }, files: data.files });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setStatus("Copied!");
      }
    } catch {
      setStatus("Failed");
    }
    setTimeout(() => setStatus(null), 2000);
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Export</h3>
      {status && (
        <div className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">{status}</div>
      )}
      <button onClick={() => handleExport("png")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
        </span>
        <div><div className="font-medium">PNG</div><div className="text-xs text-gray-400">Raster image</div></div>
      </button>
      <button onClick={() => handleExport("svg")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
        </span>
        <div><div className="font-medium">SVG</div><div className="text-xs text-gray-400">Vector format</div></div>
      </button>
      <div className="my-2 border-t border-gray-100" />
      <button onClick={() => handleExport("copy")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
        </span>
        <div><div className="font-medium">Copy PNG</div><div className="text-xs text-gray-400">To clipboard</div></div>
      </button>
      <DriveExportButton getSceneData={getSceneData} onStatus={setStatus} />
    </div>
  );
}

function DriveExportButton({
  getSceneData,
  onStatus,
}: {
  getSceneData: () => { elements: unknown[]; appState: unknown; files: unknown } | null;
  onStatus: (msg: string | null) => void;
}) {
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    driveApi.getStatus().then((s) => setDriveConnected(s.connected)).catch(() => setDriveConnected(false));
  }, []);

  if (driveConnected === null || driveConnected === false) return null;

  async function handleDriveExport() {
    const data = getSceneData();
    if (!data) return;
    setExporting(true);
    onStatus(null);
    try {
      const content = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "drawhaus",
        elements: data.elements,
        appState: data.appState,
      }, null, 2);

      const result = await driveApi.export({
        format: "excalidraw",
        targetFolderId: "root",
        content,
        fileName: `diagram-${new Date().toISOString().slice(0, 10)}.excalidraw`,
      });
      if (result.webViewLink) {
        onStatus("Saved to Drive!");
      } else {
        onStatus("Saved to Drive!");
      }
    } catch {
      onStatus("Drive export failed");
    } finally {
      setExporting(false);
      setTimeout(() => onStatus(null), 3000);
    }
  }

  return (
    <>
      <div className="my-2 border-t border-gray-100" />
      <button onClick={handleDriveExport} disabled={exporting} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>
        </span>
        <div><div className="font-medium">{exporting ? "Saving..." : "Google Drive"}</div><div className="text-xs text-gray-400">Export to Drive</div></div>
      </button>
    </>
  );
}

/* ───────────────────────── share panel ───────────────────────── */

function SharePanel({
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
    </div>
  );
}

/* ───────────────────────── settings panel ───────────────────────── */

function SettingsPanel({ userEmail }: { userEmail: string }) {
  const { logout } = useAuth();

  return (
    <div className="space-y-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Account</h3>
      <div className="rounded-lg bg-gray-50 px-3 py-2.5">
        <p className="truncate text-sm font-medium text-gray-900">{userEmail}</p>
      </div>
      <Link to="/dashboard" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
        Dashboard
      </Link>
      <Link to="/settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        Settings
      </Link>
      <div className="border-t border-gray-100 pt-2">
        <button onClick={() => logout()} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          Logout
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────── main sidebar ───────────────────────── */

export function BoardSidebar({
  userEmail,
  excalidrawApiRef,
  commentCount,
  commentsPanelOpen,
  onToggleComments,
  presenceUsers,
  followingUserId,
  onFollow,
  onCreateShareLink,
  canEdit,
  onCreateScene,
}: BoardSidebarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function togglePanel(panel: ActivePanel) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  // Close panel on outside click
  useEffect(() => {
    if (!activePanel) return;
    function handleClick(e: MouseEvent) {
      const sidebar = document.getElementById("board-sidebar");
      if (sidebar && !sidebar.contains(e.target as Node)) {
        setActivePanel(null);
      }
    }
    const timer = setTimeout(() => document.addEventListener("mousedown", handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [activePanel]);

  // Close panel on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && activePanel) {
        setActivePanel(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activePanel]);

  return (
    <div id="board-sidebar" className="flex h-full shrink-0">
      {/* Icon bar */}
      <div className="flex h-full w-14 flex-col items-center border-r border-gray-200 bg-white/95 backdrop-blur-sm py-3">
        {/* Top actions */}
        <div className="flex flex-col items-center gap-1.5">
          <SidebarButton icon={<ExportIcon />} label="Export" active={activePanel === "export"} onClick={() => togglePanel("export")} />
        </div>

        <div className="mx-3 my-3 h-px w-6 bg-gray-200" />

        <div className="flex flex-col items-center gap-1.5">
          <SidebarButton
            icon={<CommentIcon />}
            label="Comments"
            active={commentsPanelOpen}
            badge={commentCount}
            onClick={() => { setActivePanel(null); onToggleComments(); }}
          />
          <SidebarButton
            icon={<ShareIcon />}
            label="Share & Collaborate"
            active={activePanel === "share"}
            badge={presenceUsers.length > 1 ? presenceUsers.length : undefined}
            onClick={() => togglePanel("share")}
          />
        </div>

        <div className="mx-3 my-3 h-px w-6 bg-gray-200" />

        {canEdit && (
          <SidebarButton icon={<PlusIcon />} label="New scene" accent onClick={onCreateScene} />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom */}
        <div className="flex flex-col items-center gap-1.5">
          <SidebarButton
            icon={<HomeIcon />}
            label="Dashboard"
            onClick={() => {
              if (window.confirm("Leave this diagram and go to Dashboard?")) {
                window.location.href = "/dashboard";
              }
            }}
          />
          <SidebarButton icon={<GearIcon />} label="Settings" active={activePanel === "settings"} onClick={() => togglePanel("settings")} />
        </div>
      </div>

      {/* Expandable drawer panel — pushes canvas */}
      <div
        ref={panelRef}
        className={`h-full overflow-y-auto border-r border-gray-200 bg-white transition-[width] duration-200 ease-out ${
          activePanel ? "w-[300px]" : "w-0"
        }`}
      >
        <div className="w-[300px] p-4">
          {activePanel === "export" && <ExportPanel excalidrawApiRef={excalidrawApiRef} />}
          {activePanel === "share" && (
            <SharePanel
              presenceUsers={presenceUsers}
              followingUserId={followingUserId}
              onFollow={onFollow}
              onCreateShareLink={onCreateShareLink}
            />
          )}
          {activePanel === "settings" && <SettingsPanel userEmail={userEmail} />}
        </div>
      </div>
    </div>
  );
}
