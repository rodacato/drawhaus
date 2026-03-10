import { useCallback, useEffect, useRef, useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  return (
    <div className="relative h-screen w-screen">
      <BoardSidebar
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      <div className="pointer-events-none fixed left-16 top-3 z-20 flex flex-col gap-1">
        {/* Row 1: Title, Export, Comments, Users Online — all h-10 */}
        <div className="flex h-10 items-stretch gap-3">
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
          <div className="pointer-events-auto flex">
            <ExportMenu excalidrawApiRef={collab.excalidrawApiRef} />
          </div>
          <button
            onClick={() => setCommentsPanelOpen((prev) => !prev)}
            className={`pointer-events-auto flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium shadow-sm transition ${
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
          <div className="pointer-events-auto relative flex">
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
          <div className="flex items-center">
            <ConnectionBadge connectionState={collab.connectionState} connectionError={collab.connectionError} />
          </div>
        </div>
        {/* Row 2: Save status */}
        {canEdit && (
          <div className={`pointer-events-auto w-fit rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${collab.saveColor}`}>
            {collab.saveLabel}
          </div>
        )}
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
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-white/60">
          <div className="rounded-lg bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
            Loading scene...
          </div>
        </div>
      )}

      <div className="flex h-full w-full">
        <div className="flex-1" onPointerMove={collab.onPointerMove}>
          <ExcalidrawCanvas
            excalidrawAPI={collab.onExcalidrawApi}
            initialData={collab.initialData}
            onChange={handleChange}
          />
        </div>

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
            switchingScene={collab.switchingScene}
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
