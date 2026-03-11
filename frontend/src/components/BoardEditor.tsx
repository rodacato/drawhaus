import { useCallback, useEffect, useRef, useState } from "react";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { CursorOverlay } from "@/components/CursorOverlay";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { DriveSyncBadge, type DriveSyncState } from "@/components/DriveSyncBadge";
import { FollowingBanner } from "@/components/BoardToolbar";
import { BoardSidebar } from "@/components/BoardSidebar";
// SceneTabBar removed — scenes managed from sidebar
import { CommentsPanel } from "@/components/CommentsPanel";
import { CommentIndicators } from "@/components/CommentIndicators";
import { useCollaboration } from "@/lib/hooks/useCollaboration";
import { useComments } from "@/lib/hooks/useComments";
import { shareApi } from "@/api/share";
import { diagramsApi } from "@/api/diagrams";
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
  title: initialTitle,
  userEmail,
  initialElements,
  initialAppState,
}: BoardEditorProps) {
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [showCommentIndicators, setShowCommentIndicators] = useState(true);
  const [diagramTitle, setDiagramTitle] = useState(initialTitle);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const collab = useCollaboration({
    diagramId,
    canEdit: true,
    joinMode: { type: "authenticated", roomId: diagramId },
    initialElements,
    initialAppState,
  });

  const comments = useComments({ diagramId, sceneId: collab.activeSceneId, socketRef: collab.socketRef });

  // Drive sync status from socket
  const [driveSyncState, setDriveSyncState] = useState<DriveSyncState>("idle");
  const [driveSyncError, setDriveSyncError] = useState<string | null>(null);

  useEffect(() => {
    const socket = collab.socketRef.current;
    if (!socket) return;
    const handler = ({ synced, error }: { synced: boolean; error?: string }) => {
      if (synced) {
        setDriveSyncState("synced");
        setDriveSyncError(null);
        const timer = setTimeout(() => setDriveSyncState("idle"), 5000);
        return () => clearTimeout(timer);
      }
      if (error) {
        setDriveSyncState("error");
        setDriveSyncError(error);
        const timer = setTimeout(() => setDriveSyncState("idle"), 8000);
        return () => clearTimeout(timer);
      }
    };
    socket.on("drive-sync-status", handler);
    return () => { socket.off("drive-sync-status", handler); };
  }, [collab.socketRef]);

  const canEdit = collab.userRole === "owner" || collab.userRole === "editor";

  const commentsPanelRef = useRef(commentsPanelOpen);
  commentsPanelRef.current = commentsPanelOpen;

  // Track selected element and current elements reactively via onChange
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const selectedElementIdRef = useRef<string | null>(null);
  const currentElementsRef = useRef<readonly unknown[]>(initialElements);
  const [currentElementsVersion, setCurrentElementsVersion] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _elemVer = currentElementsVersion; // subscribe to version bumps
  const currentElements = currentElementsRef.current;

  // Wrap collab.onChange to also track selection/elements for comments
  const onChangeRef = useRef(collab.onChange);
  onChangeRef.current = collab.onChange;
  const handleChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      onChangeRef.current(elements, appState);
      // Update selected element — only setState if it actually changed
      const selected = appState.selectedElementIds as Record<string, boolean> | undefined;
      let newId: string | null = null;
      if (selected) {
        const ids = Object.keys(selected).filter((k) => selected[k]);
        newId = ids.length === 1 ? ids[0] : null;
      }
      if (newId !== selectedElementIdRef.current) {
        selectedElementIdRef.current = newId;
        setSelectedElementId(newId);
      }
      currentElementsRef.current = elements;
      // Bump version only when comments panel is open
      if (commentsPanelRef.current) {
        setCurrentElementsVersion((v) => v + 1);
      }
    },
    [],
  );

  // Keyboard shortcut: Cmd+/ to toggle comments
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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

  function startEditingTitle() {
    if (!canEdit) return;
    setTitleDraft(diagramTitle || "");
    setEditingTitle(true);
  }

  async function saveTitle() {
    setEditingTitle(false);
    const newTitle = titleDraft.trim();
    if (!newTitle || newTitle === diagramTitle) return;
    setDiagramTitle(newTitle);
    try {
      await diagramsApi.update(diagramId, { title: newTitle });
    } catch { /* revert on error */
      setDiagramTitle(diagramTitle);
    }
  }

  const unresolvedCount = comments.threads.filter((t) => !t.resolved).length;

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar — icon bar + expandable drawer (pushes canvas) */}
      <BoardSidebar
        userEmail={userEmail}
        excalidrawApiRef={collab.excalidrawApiRef}
        commentCount={unresolvedCount}
        commentsPanelOpen={commentsPanelOpen}
        onToggleComments={() => setCommentsPanelOpen((prev) => !prev)}
        presenceUsers={collab.presenceUsers}
        followingUserId={collab.followingUserId}
        onFollow={collab.setFollowingUserId}
        onCreateShareLink={handleCreateShareLink}
        canEdit={canEdit}
        onCreateScene={collab.createScene}
      />

      {/* Main content area */}
      <div className="relative flex-1 flex h-full min-w-0 overflow-hidden">
        {/* Top bar — floats over canvas */}
        <div className="pointer-events-none absolute left-2 top-3 z-20 flex flex-col gap-1">
          <div className="flex h-10 items-stretch gap-3">
            {/* Title */}
            <div className="pointer-events-auto flex min-w-[250px] items-center rounded-lg bg-white px-4 shadow-sm">
              {editingTitle ? (
                <input
                  className="w-full border-b border-blue-400 bg-transparent text-lg font-medium text-[#1b1b1f] outline-none"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  autoFocus
                />
              ) : (
                <button
                  className="text-left text-lg font-medium text-[#1b1b1f] hover:text-blue-600 transition-colors"
                  onClick={startEditingTitle}
                  title={canEdit ? "Click to rename" : undefined}
                >
                  {diagramTitle || "Untitled"}
                </button>
              )}
            </div>
            {/* Connection badge */}
            <div className="pointer-events-auto flex items-center">
              <ConnectionBadge connectionState={collab.connectionState} connectionError={collab.connectionError} />
            </div>
          </div>
          {/* Save status + Drive sync */}
          <div className="pointer-events-auto flex items-center gap-2">
            {canEdit && (
              <div className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${collab.saveColor}`}>
                {collab.saveLabel}
              </div>
            )}
            <DriveSyncBadge state={driveSyncState} error={driveSyncError} />
          </div>
        </div>

        {collab.followingUserId && (
          <FollowingBanner
            presenceUsers={collab.presenceUsers}
            followingUserId={collab.followingUserId}
            onStop={() => collab.setFollowingUserId(null)}
          />
        )}

        <CursorOverlay cursors={collab.cursors} />
        {showCommentIndicators && (
          <CommentIndicators
            elementsWithComments={comments.elementsWithComments}
            excalidrawApiRef={collab.excalidrawApiRef}
            onClickIndicator={handleClickIndicator}
          />
        )}

        {/* Scene loading overlay */}
        {collab.switchingScene && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/60">
            <div className="rounded-lg bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
              Loading scene...
            </div>
          </div>
        )}

        {/* Canvas */}
        <div className="relative flex-1 h-full min-w-0" onPointerMove={collab.onPointerMove}>
          <ExcalidrawCanvas
            excalidrawAPI={collab.onExcalidrawApi}
            initialData={collab.initialData}
            onChange={handleChange}
          />
        </div>

        {/* Comments panel */}
        {commentsPanelOpen && (
          <CommentsPanel
            threads={comments.threads}
            elements={currentElements}
            selectedElementId={selectedElementId}
            showIndicators={showCommentIndicators}
            onToggleIndicators={() => setShowCommentIndicators((v) => !v)}
            onCreateThread={comments.createThread}
            onReply={comments.addReply}
            onResolve={comments.resolveThread}
            onDelete={comments.deleteThread}
            onToggleLike={comments.toggleLike}
            onHighlightElement={handleHighlightElement}
            onClose={() => setCommentsPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
