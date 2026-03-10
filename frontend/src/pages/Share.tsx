import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { shareApi } from "@/api/share";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { CursorOverlay } from "@/components/CursorOverlay";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BoardToolbarTrigger, BoardToolbarPanel, FollowingBanner } from "@/components/BoardToolbar";
import { SceneTabBar } from "@/components/SceneTabBar";
import { useCollaboration } from "@/lib/hooks/useCollaboration";
import { ui } from "@/lib/ui";

type ShareData = {
  diagramId: string;
  title: string;
  role: "editor" | "viewer";
  elements: unknown[];
  appState: Record<string, unknown>;
};

export function Share() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    shareApi.resolve(token).then((res) => {
      const d = res.diagram ?? res;
      setData({
        diagramId: d.diagramId ?? d.id,
        title: d.title ?? "",
        role: res.role ?? d.role ?? "viewer",
        elements: d.elements ?? [],
        appState: d.appState ?? d.app_state ?? {},
      });
    }).catch(() => setError("Share link not found or expired"));
  }, [token]);

  if (error) return <div className="flex h-screen items-center justify-center text-sm text-red-600">{error}</div>;
  if (!data) return <div className="flex h-screen items-center justify-center text-sm text-text-muted">Loading...</div>;

  return <ShareViewInner shareToken={token!} data={data} />;
}

function ShareViewInner({ shareToken, data }: { shareToken: string; data: ShareData }) {
  const storageKey = `drawhaus_guest_${shareToken}`;
  const [guestName, setGuestName] = useState(() => localStorage.getItem(storageKey) ?? "");
  const [joined, setJoined] = useState(false);
  const autoJoinedRef = useRef(false);
  const canEdit = data.role === "editor";

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

  if (!joined) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-surface px-4 py-8 overflow-hidden">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-coral/10 blur-3xl" />

        <div className="relative w-full max-w-md space-y-0 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm">
          {/* Session preview header */}
          <div className="relative h-40 bg-gradient-to-br from-primary/20 via-surface-dark to-accent-coral/20">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-surface-raised/80 px-3 py-1 text-xs font-medium text-text-secondary backdrop-blur">
                Live Session
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="space-y-1">
              <h1 className={ui.h1}>{data.title || "Shared Diagram"}</h1>
              <p className={ui.subtitle}>{canEdit ? "Enter your name to join and collaborate." : "Enter your name to view this diagram."}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleJoin(); }} className="space-y-3">
              <label className={ui.label}>
                Your name
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <input className={`${ui.input} pl-10`} type="text" placeholder="Guest" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={50} autoFocus />
                </div>
              </label>
              <button type="submit" className={`${ui.btn} ${ui.btnPrimary} w-full gap-2`}>
                {canEdit ? "Join Session" : "View Diagram"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </form>
            <div className="flex items-center justify-between">
              <p className={ui.muted}>Viewing as <span className="font-medium capitalize">{data.role}</span></p>
              <img src="/logo-icon.svg" alt="Drawhaus" className="h-5 w-5 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ShareCanvas shareToken={shareToken} data={data} guestName={guestName} />;
}

function ShareCanvas({ shareToken, data, guestName }: { shareToken: string; data: ShareData; guestName: string }) {
  const canEdit = data.role === "editor";
  const collab = useCollaboration({
    diagramId: data.diagramId,
    canEdit,
    joinMode: { type: "guest", shareToken, guestName },
    initialElements: data.elements,
    initialAppState: data.appState,
  });

  return (
    <div className="relative h-screen w-screen">
      <div className="pointer-events-none fixed left-4 top-3 z-20 flex items-center gap-3">
        <div className="pointer-events-auto rounded-lg bg-white px-4 py-2 shadow-sm"><span className="text-lg font-medium text-[#1b1b1f]">{data.title || "Untitled"}</span></div>
        <div className="pointer-events-auto rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-medium text-purple-700 shadow-sm">{guestName} (guest)</div>
        {canEdit ? (
          <div className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${collab.saveColor}`}>{collab.saveLabel}</div>
        ) : (
          <div className="pointer-events-auto rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600 shadow-sm">View only</div>
        )}
        <div className="pointer-events-auto relative">
          <BoardToolbarTrigger open={collab.toolbarOpen} onToggle={() => collab.setToolbarOpen(!collab.toolbarOpen)} userCount={collab.presenceUsers.length || 1} />
          {collab.toolbarOpen && <BoardToolbarPanel presenceUsers={collab.presenceUsers} followingUserId={collab.followingUserId} onFollow={collab.setFollowingUserId} onCreateShareLink={async () => null} showShare={false} onClose={() => collab.setToolbarOpen(false)} />}
        </div>
        <ConnectionBadge connectionState={collab.connectionState} connectionError={collab.connectionError} />
      </div>
      {collab.followingUserId && <FollowingBanner presenceUsers={collab.presenceUsers} followingUserId={collab.followingUserId} onStop={() => collab.setFollowingUserId(null)} />}
      <CursorOverlay cursors={collab.cursors} />
      <div className="h-full w-full" onPointerMove={collab.onPointerMove}>
        <ExcalidrawCanvas excalidrawAPI={collab.onExcalidrawApi} initialData={collab.initialData} onChange={collab.onChange} viewModeEnabled={!canEdit} />
      </div>
      {collab.scenes.length > 0 && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 z-20 -translate-x-1/2">
          <SceneTabBar scenes={collab.scenes} activeSceneId={collab.activeSceneId} switchingScene={collab.switchingScene} canEdit={canEdit} onSwitch={collab.switchScene} onCreate={collab.createScene} onDelete={collab.deleteScene} onRename={collab.renameScene} />
        </div>
      )}
    </div>
  );
}
