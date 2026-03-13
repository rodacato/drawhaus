import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";
import type { ExcalidrawApi, PresenceUserWithSelf } from "@/lib/types";
import { SidebarButton } from "./board-sidebar/SidebarButton";
import { ExportIcon, CommentIcon, ShareIcon, PlusIcon, HomeIcon, GearIcon, TemplateIcon } from "./board-sidebar/icons";
import { ExportPanel } from "./board-sidebar/ExportPanel";
import { SharePanel } from "./board-sidebar/SharePanel";
import { SettingsPanel } from "./board-sidebar/SettingsPanel";
import { SaveTemplatePanel } from "./board-sidebar/SaveTemplatePanel";

/* ───────────────────────── types ───────────────────────── */

type ActivePanel = "export" | "share" | "settings" | "template" | null;

type BoardSidebarProps = {
  userEmail: string;
  excalidrawApiRef: React.RefObject<ExcalidrawApi | null>;
  commentCount: number;
  commentsPanelOpen: boolean;
  onToggleComments: () => void;
  presenceUsers: PresenceUserWithSelf[];
  followingUserId: string | null;
  onFollow: (userId: string | null) => void;
  onCreateShareLink: (role: "viewer" | "editor") => Promise<string | null>;
  canEdit: boolean;
  onCreateScene: () => void;
  saveState: string;
  onBeforeLeave: () => Promise<void>;
  workspaceId?: string | null;
};

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
  saveState,
  onBeforeLeave,
  workspaceId,
}: BoardSidebarProps) {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    setLeaving(true);
    try {
      await onBeforeLeave();
    } catch { /* best effort */ }
    navigate("/dashboard");
  }

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
          <>
            <SidebarButton icon={<PlusIcon />} label="New scene" accent onClick={onCreateScene} />
            <SidebarButton icon={<TemplateIcon />} label="Save as Template" active={activePanel === "template"} onClick={() => togglePanel("template")} />
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom */}
        <div className="flex flex-col items-center gap-1.5">
          <SidebarButton
            icon={<HomeIcon />}
            label="Dashboard"
            onClick={() => setLeaveOpen(true)}
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
          {activePanel === "settings" && <SettingsPanel userEmail={userEmail} onDashboardClick={() => setLeaveOpen(true)} />}
          {activePanel === "template" && <SaveTemplatePanel excalidrawApiRef={excalidrawApiRef} workspaceId={workspaceId} />}
        </div>
      </div>

      {leaveOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !leaving && setLeaveOpen(false)} />
          <div className={`${ui.card} relative z-10 w-full max-w-sm space-y-4 shadow-2xl`}>
            <h2 className={ui.h2}>Leave Diagram</h2>
            <p className="text-sm text-text-secondary">
              {saveState === "pending" || saveState === "saving"
                ? "You have unsaved changes. They will be saved before leaving."
                : "Are you sure you want to go back to the Dashboard?"}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setLeaveOpen(false)} disabled={leaving} className={`${ui.btn} ${ui.btnSecondary}`}>
                Cancel
              </button>
              <button
                type="button"
                disabled={leaving}
                className={`${ui.btn} ${ui.btnPrimary}`}
                onClick={handleLeave}
              >
                {leaving ? "Saving..." : "Leave"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
