"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { io, type Socket } from "socket.io-client";
import { ui } from "@/lib/ui";

type ExcalidrawApi = {
  updateScene: (scene: { elements?: unknown[]; appState?: Record<string, unknown> }) => void;
  getSceneElements?: () => readonly unknown[];
};

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);
const ExcalidrawCanvas = Excalidraw as unknown as ComponentType<{
  excalidrawAPI?: (api: ExcalidrawApi) => void;
  initialData: {
    elements: unknown[];
    appState: Record<string, unknown>;
  };
  onChange?: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  viewModeEnabled?: boolean;
}>;

type PresenceUser = { userId: string; name: string; isGuest: boolean };
type CursorInfo = { name: string; x: number; y: number; lastSeen: number };

type ShareViewProps = {
  shareToken: string;
  diagramId: string;
  title: string;
  role: "editor" | "viewer";
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
};

const THROTTLE_MS = 50;
const CURSOR_THROTTLE_MS = 30;
const SAVE_DEBOUNCE_MS = 1200;
const CURSOR_TIMEOUT_MS = 5000;

type ExcalidrawElement = {
  id: string;
  version: number;
  [key: string]: unknown;
};

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mergeElements(
  localElements: readonly unknown[],
  remoteElements: unknown[]
): unknown[] {
  const localMap = new Map<string, ExcalidrawElement>();
  for (const el of localElements) {
    const e = el as ExcalidrawElement;
    if (e.id) localMap.set(e.id, e);
  }

  const remoteMap = new Map<string, ExcalidrawElement>();
  for (const el of remoteElements) {
    const e = el as ExcalidrawElement;
    if (e.id) remoteMap.set(e.id, e);
  }

  const merged = new Map<string, ExcalidrawElement>();

  for (const [id, remote] of remoteMap) {
    const local = localMap.get(id);
    if (local && (local.version ?? 0) >= (remote.version ?? 0)) {
      merged.set(id, local);
    } else {
      merged.set(id, remote);
    }
  }

  for (const [id, local] of localMap) {
    if (!remoteMap.has(id)) {
      merged.set(id, local);
    }
  }

  return Array.from(merged.values());
}

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
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");

  const socketRef = useRef<Socket | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
  const applyingRemoteCounter = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitTime = useRef(0);
  const lastCursorEmitTime = useRef(0);
  const lastSavedAt = useRef<string | null>(null);
  const pendingSceneRef = useRef<{ elements: unknown[] } | null>(null);

  const canEdit = role === "editor";
  const cacheKey = `drawhaus_scene_${diagramId}`;

  const initialData = useMemo(() => {
    // Try localStorage cache first for instant load
    let elements = initialElements;
    let appState = initialAppState;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.elements) && parsed.elements.length > 0) {
          elements = parsed.elements;
        }
        if (parsed.appState) {
          appState = parsed.appState;
        }
      }
    } catch { /* ignore */ }

    return {
      elements,
      appState: {
        ...appState,
        collaborators: new Map(),
        gridModeEnabled: true,
        theme: "light",
        viewBackgroundColor: "#f8f9fc",
      },
    };
  }, [initialElements, initialAppState, cacheKey]);

  // Clean stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next: Record<string, CursorInfo> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.lastSeen < CURSOR_TIMEOUT_MS) next[k] = v;
        }
        return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (throttleTimer.current) clearTimeout(throttleTimer.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Auto-join if name was previously saved
  useEffect(() => {
    if (autoJoinedRef.current) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      autoJoinedRef.current = true;
      setGuestName(saved);
      connectSocket(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function connectSocket(name: string) {

    const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room-guest", { shareToken, guestName: name });
    });

    socket.on("connect_error", (err) => {
      setConnectionError(err.message);
    });

    socket.on("room-error", ({ message }: { message: string }) => {
      setConnectionError(message);
    });

    socket.on("room-joined", () => {
      setJoined(true);
      setConnectionError(null);
    });

    socket.on("scene-from-db", ({ elements }: { elements: unknown[] }) => {
      if (!excalidrawApiRef.current) {
        pendingSceneRef.current = { elements };
        return;
      }
      const localElements = excalidrawApiRef.current.getSceneElements?.() ?? [];
      if (localElements.length > 0) return;

      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current.updateScene({ elements });
      requestAnimationFrame(() => {
        applyingRemoteCounter.current -= 1;
      });
    });

    socket.on("scene-updated", ({
      fromSocketId,
      elements: remoteElements,
    }: {
      fromSocketId: string;
      elements: unknown[];
    }) => {
      if (fromSocketId === socket.id) return;
      const localElements = excalidrawApiRef.current?.getSceneElements?.() ?? [];
      const merged = mergeElements(localElements, remoteElements);
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: merged });
      requestAnimationFrame(() => {
        applyingRemoteCounter.current -= 1;
      });
    });

    socket.on("room-presence", ({ users }: { users: PresenceUser[] }) => {
      setPresenceUsers(users);
    });

    socket.on("cursor-moved", ({ userId, name: cursorName, x, y }: { userId: string; name: string; x: number; y: number }) => {
      setCursors((prev) => ({
        ...prev,
        [userId]: { name: cursorName, x, y, lastSeen: Date.now() },
      }));
    });

    socket.on("cursor-left", ({ userId }: { userId: string }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    socket.on("scene-saved", () => {
      lastSavedAt.current = new Date().toLocaleTimeString();
      setSaveState("saved");
    });
  }

  function handleJoin() {
    const name = guestName.trim() || "Guest";
    setGuestName(name);
    localStorage.setItem(storageKey, name);
    connectSocket(name);
  }

  const persistScene = useCallback(
    (elements: unknown[], appState: Record<string, unknown>) => {
      setSaveState("saving");
      const sanitizedAppState = jsonSafe({ ...appState, collaborators: undefined });
      const safeElements = jsonSafe(elements);

      // Cache to localStorage for instant reload
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ elements: safeElements, appState: sanitizedAppState }));
      } catch { /* quota exceeded */ }

      if (socketRef.current?.connected) {
        socketRef.current.emit("save-scene", {
          roomId: diagramId,
          elements: safeElements,
          appState: sanitizedAppState,
        });
      }
    },
    [diagramId, cacheKey]
  );

  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      if (applyingRemoteCounter.current > 0) return;
      if (!canEdit) return;

      setSaveState("pending");

      const now = Date.now();
      const elapsed = now - lastEmitTime.current;
      if (elapsed >= THROTTLE_MS) {
        lastEmitTime.current = now;
        socketRef.current?.emit("scene-update", {
          roomId: diagramId,
          elements: [...elements],
        });
      } else if (!throttleTimer.current) {
        throttleTimer.current = setTimeout(() => {
          throttleTimer.current = null;
          lastEmitTime.current = Date.now();
          socketRef.current?.emit("scene-update", {
            roomId: diagramId,
            elements: [...(excalidrawApiRef.current?.getSceneElements?.() ?? elements)],
          });
        }, THROTTLE_MS - elapsed);
      }

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        persistScene([...elements], appState);
      }, SAVE_DEBOUNCE_MS);
    },
    [diagramId, persistScene, canEdit]
  );

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
          {connectionError && (
            <div className={ui.alertError}>{connectionError}</div>
          )}
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

  const saveLabel = {
    idle: "Ready",
    pending: "Unsaved",
    saving: "Saving...",
    saved: lastSavedAt.current ? `Saved ${lastSavedAt.current}` : "Saved",
    error: "Error",
  }[saveState];

  const saveColor = {
    idle: "bg-white/80 text-black/50",
    pending: "bg-amber-100 text-amber-700",
    saving: "bg-blue-100 text-blue-700",
    saved: "bg-emerald-100 text-emerald-700",
    error: "bg-red-100 text-red-700",
  }[saveState];

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
        {canEdit && (
          <div className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${saveColor}`}>
            {saveLabel}
          </div>
        )}
        {!canEdit && (
          <div className="pointer-events-auto rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600 shadow-sm">
            View only
          </div>
        )}
        <div className="pointer-events-auto rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[#1b1b1f] shadow-sm">
          {presenceUsers.length || 1} online
        </div>
      </div>

      {/* Cursors overlay */}
      <div className="pointer-events-none fixed inset-0 z-10">
        {Object.entries(cursors).map(([userId, cursor]) => (
          <div
            key={userId}
            className="absolute"
            style={{ left: cursor.x, top: cursor.y }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M0 0L6 14L8 8L14 6L0 0Z" fill="#6366f1" stroke="#fff" strokeWidth="1" />
            </svg>
            <span className="ml-3 -mt-1 inline-block rounded bg-indigo-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm whitespace-nowrap">
              {cursor.name}
            </span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div
        className="h-full w-full"
        onPointerMove={(e) => {
          const now = Date.now();
          if (now - lastCursorEmitTime.current >= CURSOR_THROTTLE_MS) {
            lastCursorEmitTime.current = now;
            socketRef.current?.emit("cursor-move", {
              roomId: diagramId,
              x: e.clientX,
              y: e.clientY,
            });
          }
        }}
      >
        <ExcalidrawCanvas
          excalidrawAPI={(api) => {
            excalidrawApiRef.current = api;
            if (pendingSceneRef.current) {
              const pending = pendingSceneRef.current;
              pendingSceneRef.current = null;
              applyingRemoteCounter.current += 1;
              api.updateScene({ elements: pending.elements });
              requestAnimationFrame(() => {
                applyingRemoteCounter.current -= 1;
              });
            }
          }}
          initialData={initialData}
          onChange={canEdit ? onChange : undefined}
          viewModeEnabled={!canEdit}
        />
      </div>
    </div>
  );
}
