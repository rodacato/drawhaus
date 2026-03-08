import { useCallback, useEffect, useState } from "react";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { CursorOverlay } from "@/components/CursorOverlay";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BoardToolbarTrigger, BoardToolbarPanel, FollowingBanner } from "@/components/BoardToolbar";
import { BoardSidebar } from "@/components/BoardSidebar";
import { ExportMenu } from "@/components/ExportMenu";
import { SceneTabBar } from "@/components/SceneTabBar";
import { useCollaboration } from "@/lib/hooks/useCollaboration";
import { shareApi } from "@/api/share";

type BoardEditorProps = {
  diagramId: string;
  title: string;
  userEmail: string;
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
};

export default function BoardEditor({
  diagramId,
  title,
  userEmail,
  initialElements,
  initialAppState,
}: BoardEditorProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const collab = useCollaboration({
    diagramId,
    canEdit: true,
    joinMode: { type: "authenticated", roomId: diagramId },
    initialElements,
    initialAppState,
  });

  const canEdit = collab.userRole === "owner" || collab.userRole === "editor";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCreateShareLink = useCallback(async (role: "viewer" | "editor"): Promise<string | null> => {
    const cacheShareKey = `drawhaus_share_${diagramId}_${role}`;
    const cached = localStorage.getItem(cacheShareKey);
    if (cached) return cached;

    try {
      const payload = await shareApi.create(diagramId, role);
      const token = payload.shareLink?.token;
      if (token) {
        const url = `${window.location.origin}/share/${token}`;
        try { localStorage.setItem(cacheShareKey, url); } catch { /* quota */ }
        return url;
      }
      return null;
    } catch {
      return null;
    }
  }, [diagramId]);

  return (
    <div className="relative h-screen w-screen">
      <BoardSidebar
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="pointer-events-none fixed left-16 top-3 z-20 flex items-center gap-3">
        <div className="pointer-events-auto rounded-lg bg-white px-4 py-2 shadow-sm">
          <span className="text-lg font-medium text-[#1b1b1f]">{title || "Untitled"}</span>
        </div>
        {canEdit && (
          <div className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${collab.saveColor}`}>
            {collab.saveLabel}
          </div>
        )}
        <div className="pointer-events-auto relative">
          <BoardToolbarTrigger
            open={collab.toolbarOpen}
            onToggle={() => collab.setToolbarOpen(!collab.toolbarOpen)}
            userCount={collab.presenceUsers.length || 1}
          />
          {collab.toolbarOpen && (
            <BoardToolbarPanel
              presenceUsers={collab.presenceUsers}
              followingUserId={collab.followingUserId}
              onFollow={collab.setFollowingUserId}
              onCreateShareLink={handleCreateShareLink}
              onClose={() => collab.setToolbarOpen(false)}
            />
          )}
        </div>
        <div className="pointer-events-auto">
          <ExportMenu excalidrawApiRef={collab.excalidrawApiRef} />
        </div>
        <ConnectionBadge connectionState={collab.connectionState} connectionError={collab.connectionError} />
      </div>

      {collab.followingUserId && (
        <FollowingBanner
          presenceUsers={collab.presenceUsers}
          followingUserId={collab.followingUserId}
          onStop={() => collab.setFollowingUserId(null)}
        />
      )}

      <CursorOverlay cursors={collab.cursors} />

      <div className="h-full w-full" onPointerMove={collab.onPointerMove}>
        <ExcalidrawCanvas
          excalidrawAPI={collab.onExcalidrawApi}
          initialData={collab.initialData}
          onChange={collab.onChange}
        />
      </div>

      {collab.scenes.length > 0 && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 -translate-x-1/2">
          <SceneTabBar
            scenes={collab.scenes}
            activeSceneId={collab.activeSceneId}
            canEdit={canEdit}
            onSwitch={collab.switchScene}
            onCreate={collab.createScene}
            onDelete={collab.deleteScene}
            onRename={collab.renameScene}
          />
        </div>
      )}
    </div>
  );
}
