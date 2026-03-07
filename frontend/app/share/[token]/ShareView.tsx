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

const THROTTLE_MS = 100;
const SAVE_DEBOUNCE_MS = 1200;
const CURSOR_TIMEOUT_MS = 5000;

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default function ShareView({
  shareToken,
  diagramId,
  title,
  role,
  initialElements,
  initialAppState,
}: ShareViewProps) {
  const [guestName, setGuestName] = useState("");
  const [joined, setJoined] = useState(false);
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
  const lastSavedAt = useRef<string | null>(null);

  const canEdit = role === "editor";

  const initialData = useMemo(
    () => ({
      elements: initialElements,
      appState: {
        ...initialAppState,
        collaborators: new Map(),
        gridModeEnabled: true,
        theme: "light",
        viewBackgroundColor: "#f8f9fc",
      },
    }),
    [initialElements, initialAppState]
  );

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

  function handleJoin() {
    const name = guestName.trim() || "Guest";
    setGuestName(name);

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

    socket.on("scene-from-db", ({ elements, appState }: { elements: unknown[]; appState: Record<string, unknown> }) => {
      const localElements = excalidrawApiRef.current?.getSceneElements?.() ?? [];
      if (localElements.length > 0) return;

      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements, appState: { ...appState, collaborators: new Map() } });
      requestAnimationFrame(() => {
        applyingRemoteCounter.current -= 1;
      });
    });

    socket.on("scene-updated", ({
      fromSocketId,
      elements,
      appState,
    }: {
      fromSocketId: string;
      elements: unknown[];
      appState: Record<string, unknown>;
    }) => {
      if (fromSocketId === socket.id) return;
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements, appState: { ...appState, collaborators: new Map() } });
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

  const persistScene = useCallback(
    (elements: unknown[], appState: Record<string, unknown>) => {
      setSaveState("saving");
      const sanitizedAppState = jsonSafe({ ...appState, collaborators: undefined });
      if (socketRef.current?.connected) {
        socketRef.current.emit("save-scene", {
          roomId: diagramId,
          elements: jsonSafe(elements),
          appState: sanitizedAppState,
        });
      }
    },
    [diagramId]
  );

  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      if (applyingRemoteCounter.current > 0) return;
      if (!canEdit) return;

      setSaveState("pending");

      const { collaborators: _c, ...cleanAppState } = appState;

      const now = Date.now();
      const elapsed = now - lastEmitTime.current;
      if (elapsed >= THROTTLE_MS) {
        lastEmitTime.current = now;
        socketRef.current?.emit("scene-update", {
          roomId: diagramId,
          elements: [...elements],
          appState: cleanAppState,
        });
      } else if (!throttleTimer.current) {
        throttleTimer.current = setTimeout(() => {
          throttleTimer.current = null;
          lastEmitTime.current = Date.now();
          socketRef.current?.emit("scene-update", {
            roomId: diagramId,
            elements: [...(excalidrawApiRef.current?.getSceneElements?.() ?? elements)],
            appState: cleanAppState,
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
            className="absolute transition-all duration-100"
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
          socketRef.current?.emit("cursor-move", {
            roomId: diagramId,
            x: e.clientX,
            y: e.clientY,
          });
        }}
      >
        <ExcalidrawCanvas
          excalidrawAPI={(api) => {
            excalidrawApiRef.current = api;
          }}
          initialData={initialData}
          onChange={canEdit ? onChange : undefined}
          viewModeEnabled={!canEdit}
        />
      </div>
    </div>
  );
}
