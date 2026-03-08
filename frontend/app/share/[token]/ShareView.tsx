"use client";

import { useEffect, useRef, useState } from "react";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { CursorOverlay } from "@/components/CursorOverlay";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BoardToolbarTrigger, BoardToolbarPanel, FollowingBanner } from "@/components/BoardToolbar";
import { SceneTabBar } from "@/components/SceneTabBar";
import { useCollaboration } from "@/lib/hooks/useCollaboration";
import { ui } from "@/lib/ui";

type ShareViewProps = {
  shareToken: string;
  diagramId: string;
  title: string;
  role: "editor" | "viewer";
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
};

export default function ShareView({
  shareToken,
  diagramId,
  title,
  role,
  initialElements,
  initialAppState,
}: ShareViewProps) {
  const storageKey = `drawhaus_guest_${shareToken}`;
  const [guestName, setGuestName] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(storageKey) ?? "";
  });
  const [joined, setJoined] = useState(false);
  const autoJoinedRef = useRef(false);

  const canEdit = role === "editor";

  // Auto-join if name was previously saved
  useEffect(() => {
    if (autoJoinedRef.current) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      autoJoinedRef.current = true;
      setGuestName(saved);
      setJoined(true);
    }
  }, [storageKey]);

  function handleJoin() {
    const name = guestName.trim() || "Guest";
    setGuestName(name);
    localStorage.setItem(storageKey, name);
    setJoined(true);
  }

  // Guest name prompt
  if (!joined) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface px-4 py-8">
        <div className={`${ui.card} ${ui.centerNarrow} space-y-4`}>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Drawhaus
            </p>
            <h1 className={ui.h1}>{title || "Shared Diagram"}</h1>
            <p className={ui.subtitle}>
              {canEdit
                ? "Enter your name to join and collaborate."
                : "Enter your name to view this diagram."}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
            className="space-y-3"
          >
            <label className={ui.label}>
              Your name
              <input
                className={ui.input}
                type="text"
                placeholder="Guest"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={50}
                autoFocus
              />
            </label>
            <button type="submit" className={`${ui.btn} ${ui.btnPrimary} w-full`}>
              {canEdit ? "Join & Edit" : "View Diagram"}
            </button>
          </form>
          <p className={ui.muted}>
            Access: <span className="font-medium">{role}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <ShareViewCanvas
      shareToken={shareToken}
      diagramId={diagramId}
      title={title}
      canEdit={canEdit}
      guestName={guestName}
      initialElements={initialElements}
      initialAppState={initialAppState}
    />
  );
}

function ShareViewCanvas({
  shareToken,
  diagramId,
  title,
  canEdit,
  guestName,
  initialElements,
  initialAppState,
}: {
  shareToken: string;
  diagramId: string;
  title: string;
  canEdit: boolean;
  guestName: string;
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
}) {
  const collab = useCollaboration({
    diagramId,
    canEdit,
    joinMode: { type: "guest", shareToken, guestName },
    initialElements,
    initialAppState,
  });

  return (
    <div className="relative h-screen w-screen">
      {/* Top bar */}
      <div className="pointer-events-none fixed left-4 top-3 z-20 flex items-center gap-3">
        <div className="pointer-events-auto rounded-lg bg-white px-4 py-2 shadow-sm">
          <span className="text-lg font-medium text-[#1b1b1f]">
            {title || "Untitled"}
          </span>
        </div>
        <div className="pointer-events-auto rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-medium text-purple-700 shadow-sm">
          {guestName} (guest)
        </div>
        {canEdit ? (
          <div className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${collab.saveColor}`}>
            {collab.saveLabel}
          </div>
        ) : (
          <div className="pointer-events-auto rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600 shadow-sm">
            View only
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
              onCreateShareLink={async () => null}
              showShare={false}
              onClose={() => collab.setToolbarOpen(false)}
            />
          )}
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
          viewModeEnabled={!canEdit}
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
