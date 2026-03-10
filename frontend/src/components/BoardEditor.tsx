import { useCallback, useEffect, useMemo, useState } from "react";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { CursorOverlay } from "@/components/CursorOverlay";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BoardToolbarTrigger, BoardToolbarPanel, FollowingBanner } from "@/components/BoardToolbar";
import { BoardSidebar } from "@/components/BoardSidebar";
import { ExportMenu } from "@/components/ExportMenu";
import { SceneTabBar } from "@/components/SceneTabBar";
import { CommentsPanel } from "@/components/CommentsPanel";
import { CommentIndicators } from "@/components/CommentIndicators";
import { useCollaboration } from "@/lib/hooks/useCollaboration";
import { useComments } from "@/lib/hooks/useComments";
import { shareApi } from "@/api/share";
import type { ExcalidrawElement } from "@/lib/types";

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
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);

  const collab = useCollaboration({
    diagramId,
    canEdit: true,
    joinMode: { type: "authenticated", roomId: diagramId },
    initialElements,
    initialAppState,
  });

  const comments = useComments({ diagramId, socketRef: collab.socketRef });

  const canEdit = collab.userRole === "owner" || collab.userRole === "editor";

  // Track selected element for comments
  const selectedElementId = useMemo(() => {
    const api = collab.excalidrawApiRef.current;
    if (!api) return null;
    const appState = api.getAppState();
    const selected = appState.selectedElementIds as Record<string, boolean> | undefined;
    if (!selected) return null;
    const ids = Object.keys(selected).filter((k) => selected[k]);
    return ids.length === 1 ? ids[0] : null;
  }, [collab.excalidrawApiRef]);

  // Track current elements for the panel
  const currentElements = useMemo(() => {
    const api = collab.excalidrawApiRef.current;
    return api ? api.getSceneElements() : initialElements;
  }, [collab.excalidrawApiRef, initialElements]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setCommentsPanelOpen((prev) => !prev);
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

  const handleHighlightElement = useCallback((elementId: string) => {
    const api = collab.excalidrawApiRef.current;
    if (!api) return;
    const elements = api.getSceneElements() as ExcalidrawElement[];
    const el = elements.find((e) => e.id === elementId);
    if (!el) return;
    // Select and scroll to the element
    api.updateScene({
      appState: {
        selectedElementIds: { [elementId]: true },
        scrollX: -(el.x as number) + window.innerWidth / 2 - ((el.width as number) ?? 0) / 2,
        scrollY: -(el.y as number) + window.innerHeight / 2 - ((el.height as number) ?? 0) / 2,
      },
    });
  }, [collab.excalidrawApiRef]);

  const handleClickIndicator = useCallback((elementId: string) => {
    handleHighlightElement(elementId);
    setCommentsPanelOpen(true);
  }, [handleHighlightElement]);

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
        {/* Comments toggle button */}
        <button
          onClick={() => setCommentsPanelOpen((prev) => !prev)}
          className={`pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm transition ${
            commentsPanelOpen
              ? "bg-blue-100 text-blue-700"
              : "bg-white text-gray-600 hover:bg-gray-50"
          }`}
          title="Toggle comments (Cmd+/)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3a1 1 0 011-1h8a1 1 0 011 1v6a1 1 0 01-1 1H5l-2 2V10H3a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          {comments.threads.filter((t) => !t.resolved).length > 0 && (
            <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {comments.threads.filter((t) => !t.resolved).length}
            </span>
          )}
        </button>
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
      <CommentIndicators
        elementsWithComments={comments.elementsWithComments}
        excalidrawApiRef={collab.excalidrawApiRef}
        onClickIndicator={handleClickIndicator}
      />

      <div className="flex h-full w-full">
        <div className="flex-1" onPointerMove={collab.onPointerMove}>
          <ExcalidrawCanvas
            excalidrawAPI={collab.onExcalidrawApi}
            initialData={collab.initialData}
            onChange={collab.onChange}
          />
        </div>

        {commentsPanelOpen && (
          <CommentsPanel
            threads={comments.threads}
            elements={currentElements}
            selectedElementId={selectedElementId}
            onCreateThread={comments.createThread}
            onReply={comments.addReply}
            onResolve={comments.resolveThread}
            onDelete={comments.deleteThread}
            onHighlightElement={handleHighlightElement}
            onClose={() => setCommentsPanelOpen(false)}
          />
        )}
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
