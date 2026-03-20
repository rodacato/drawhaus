import { useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { ui } from "@/lib/ui";
import type { ExcalidrawApi, PresenceUserWithSelf } from "@/lib/types";
import { SidebarButton } from "./board-sidebar/SidebarButton";
import { ExportIcon, CommentIcon, ShareIcon, HomeIcon, GearIcon, TemplateIcon, CodeIcon, HistoryIcon } from "./board-sidebar/icons";
import { SidebarDrawer } from "./board-sidebar/SidebarDrawer";
import { ExportPanel } from "./board-sidebar/ExportPanel";
import { SharePanel } from "./board-sidebar/SharePanel";
import { SettingsPanel } from "./board-sidebar/SettingsPanel";
import { SaveTemplatePanel } from "./board-sidebar/SaveTemplatePanel";
import { CodeImportPanel } from "./board-sidebar/CodeImportPanel";
import { SnapshotPanel } from "./board-sidebar/SnapshotPanel";
import type { CanvasPrefs } from "@/lib/hooks/useCanvasPrefs";
import type { Socket } from "socket.io-client";

/* ───────────────────────── types ───────────────────────── */

type ActivePanel = "export" | "share" | "settings" | "template" | "code" | "snapshots" | null;

/** Panel width overrides — default is 300 */
const PANEL_WIDTH: Partial<Record<NonNullable<ActivePanel>, number>> = {
  code: 380,
};

type BoardSidebarProps = {
  diagramId: string;
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
  saveState: string;
  onBeforeLeave: () => Promise<void>;
  onSnapshotRestored?: () => void;
  workspaceId?: string | null;
  canvasPrefs: CanvasPrefs;
  onCanvasPrefsChange: (patch: Partial<CanvasPrefs>) => void;
  socketRef?: React.RefObject<Socket | null>;
};

/* ───────────────────────── main sidebar ───────────────────────── */

export function BoardSidebar({
  diagramId,
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
  saveState,
  onBeforeLeave,
  onSnapshotRestored,
  workspaceId,
  canvasPrefs,
  onCanvasPrefsChange,
  socketRef,
}: BoardSidebarProps) {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
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

  const closePanel = useCallback(() => setActivePanel(null), []);

  const drawerWidth = activePanel ? (PANEL_WIDTH[activePanel] ?? 300) : 300;

  return (
    <div id="board-sidebar" className="flex h-full shrink-0">
      {/* Icon bar */}
      <div className="flex h-full w-14 flex-col items-center border-r border-gray-200 bg-white/95 backdrop-blur-sm py-3">
        {/* Create & Import */}
        {canEdit && (
          <div className="flex flex-col items-center gap-1.5">
            <SidebarButton icon={<CodeIcon />} label="Import from Code" active={activePanel === "code"} onClick={() => togglePanel("code")} />
          </div>
        )}

        {canEdit && <div className="mx-3 my-3 h-px w-6 bg-gray-200" />}

        {/* View & Collaborate */}
        <div className="flex flex-col items-center gap-1.5">
          <SidebarButton icon={<ExportIcon />} label="Export" active={activePanel === "export"} onClick={() => togglePanel("export")} />
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

        {/* Save & History */}
        {canEdit && (
          <div className="flex flex-col items-center gap-1.5">
            <SidebarButton icon={<TemplateIcon />} label="Save as Template" active={activePanel === "template"} onClick={() => togglePanel("template")} />
            <SidebarButton icon={<HistoryIcon />} label="Version History" active={activePanel === "snapshots"} onClick={() => togglePanel("snapshots")} />
          </div>
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
      <SidebarDrawer open={!!activePanel} onClose={closePanel} width={drawerWidth}>
        {activePanel === "export" && <ExportPanel excalidrawApiRef={excalidrawApiRef} />}
        {activePanel === "share" && (
          <SharePanel
            presenceUsers={presenceUsers}
            followingUserId={followingUserId}
            onFollow={onFollow}
            onCreateShareLink={onCreateShareLink}
          />
        )}
        {activePanel === "settings" && <SettingsPanel userEmail={userEmail} onDashboardClick={() => setLeaveOpen(true)} canvasPrefs={canvasPrefs} onCanvasPrefsChange={onCanvasPrefsChange} />}
        {activePanel === "template" && <SaveTemplatePanel excalidrawApiRef={excalidrawApiRef} workspaceId={workspaceId} />}
        {activePanel === "code" && <CodeImportPanel excalidrawApiRef={excalidrawApiRef} onClose={closePanel} />}
        {activePanel === "snapshots" && <SnapshotPanel diagramId={diagramId} canEdit={canEdit} excalidrawApiRef={excalidrawApiRef} onRestored={onSnapshotRestored} socketRef={socketRef} />}
      </SidebarDrawer>

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
