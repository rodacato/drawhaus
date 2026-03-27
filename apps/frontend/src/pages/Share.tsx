import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { shareApi } from "@/api/share";
import { ExcalidrawCanvas } from "@/components/ExcalidrawCanvas";
import { CursorOverlay } from "@/components/CursorOverlay";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { BoardToolbarTrigger, BoardToolbarPanel, FollowingBanner } from "@/components/BoardToolbar";
import { CollaborationBadge } from "@/components/CollaborationBadge";
import { useCollaboration } from "@/lib/hooks/useCollaboration";
import { useCanvasPrefs } from "@/lib/hooks/useCanvasPrefs";
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
        role: res.share?.role ?? res.role ?? d.role ?? "viewer",
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

        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl">
          {/* Session preview header */}
          <div className="p-1">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-surface-dark to-accent-coral/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-3/4 w-3/4 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center">
                  <svg className="text-text-muted/30" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                </div>
              </div>
              {/* Live session badge */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Live Session
              </div>
            </div>
          </div>

          <div className="space-y-5 px-8 pb-8 pt-4">
            <div className="space-y-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Drawhaus Workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">{data.title || "Shared Diagram"}</h1>
              <p className="text-sm text-text-muted">{canEdit ? "You've been invited to collaborate." : "You've been invited to view this diagram."}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleJoin(); }} className="space-y-4">
              <label className={ui.label}>
                Your Name
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <input className={`${ui.input} h-12 pl-11 text-base`} type="text" placeholder="Enter your name to join" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={50} autoFocus />
                </div>
              </label>
              <button type="submit" className={`${ui.btn} ${ui.btnPrimary} h-12 w-full gap-2 text-base shadow-lg shadow-primary/20`}>
                {canEdit ? "Join Session" : "View Diagram"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            </form>
            <div className="flex flex-col items-center gap-3 pt-1">
              <div className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 ring-1 ring-inset ring-border">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                <span className="text-xs font-medium uppercase tracking-tight text-text-muted">Viewing as {data.role}</span>
              </div>
              <p className="text-center text-[11px] text-text-muted/60 px-4 leading-relaxed">
                By joining, you agree to the workspace terms and real-time collaboration protocols.
              </p>
            </div>
          </div>
        </div>

        {/* Branding footer */}
        <div className="mt-10 flex flex-col items-center gap-3 opacity-60">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.svg" alt="" className="h-6 w-6" />
            <span className="text-lg font-bold tracking-tight text-text-primary font-[family-name:var(--font-family-heading)]">Drawhaus</span>
          </div>
          <div className="flex gap-6 text-sm text-text-muted">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    );
  }

  return <ShareCanvas shareToken={shareToken} data={data} guestName={guestName} />;
}

function ShareCanvas({ shareToken, data, guestName }: { shareToken: string; data: ShareData; guestName: string }) {
  const canEdit = data.role === "editor";
  const { prefs: canvasPrefs } = useCanvasPrefs();
  const collab = useCollaboration({
    diagramId: data.diagramId,
    canEdit,
    joinMode: { type: "guest", shareToken, guestName },
    initialElements: data.elements,
    initialAppState: data.appState,
    canvasPrefs,
  });

  // No lock acquisition needed — concurrent editing
  const handleCanvasPointerDown = useCallback(() => {}, []);

  // Status badge logic
  let statusBadge: { label: string; className: string };
  if (!canEdit) {
    statusBadge = { label: "View only", className: "bg-gray-100 text-gray-600" };
  } else {
    statusBadge = { label: collab.saveLabel, className: collab.saveColor };
  }

  return (
    <div className="relative h-screen w-screen">
      <div className="pointer-events-none fixed left-4 top-3 z-20 flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="pointer-events-auto rounded-lg bg-white px-4 py-2 shadow-sm"><span className="text-lg font-medium text-[#1b1b1f]">{data.title || "Untitled"}</span></div>
          <div className="pointer-events-auto rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-medium text-purple-700 shadow-sm">{guestName} (guest)</div>
          <div className="pointer-events-auto relative">
            <BoardToolbarTrigger open={collab.toolbarOpen} onToggle={() => collab.setToolbarOpen(!collab.toolbarOpen)} userCount={collab.presenceUsers.length || 1} />
            {collab.toolbarOpen && <BoardToolbarPanel presenceUsers={collab.presenceUsers} followingUserId={collab.followingUserId} onFollow={collab.setFollowingUserId} onCreateShareLink={async () => null} showShare={false} onClose={() => collab.setToolbarOpen(false)} raisedHands={collab.raisedHands} />}
          </div>
          <ConnectionBadge connectionState={collab.connectionState} connectionError={collab.connectionError} />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${statusBadge.className}`}>{statusBadge.label}</div>
          <CollaborationBadge
            canEdit={canEdit}
            raisedHands={collab.raisedHands}
            isHandRaised={collab.isHandRaised}
            onRaiseHand={collab.raiseHand}
            onLowerHand={collab.lowerHand}
          />
        </div>
      </div>

      {collab.followingUserId && <FollowingBanner presenceUsers={collab.presenceUsers} followingUserId={collab.followingUserId} onStop={() => collab.setFollowingUserId(null)} />}

      <CursorOverlay cursors={collab.cursors} />
      <div className="relative h-full w-full" onPointerDown={handleCanvasPointerDown} onPointerMove={collab.onPointerMove}>
        <ExcalidrawCanvas excalidrawAPI={collab.onExcalidrawApi} initialData={collab.initialData} onChange={collab.onChange} />
      </div>
    </div>
  );
}
