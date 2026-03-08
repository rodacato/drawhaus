"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { io, type Socket } from "socket.io-client";
import { BoardSidebar } from "./BoardSidebar";

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
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
}>;

type BoardEditorProps = {
  diagramId: string;
  title: string;
  userEmail: string;
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
};

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";
type ConnectionState = "connecting" | "connected" | "disconnected" | "error";
type PresenceUser = { userId: string; name: string };
type CursorInfo = { name: string; x: number; y: number; lastSeen: number };

const THROTTLE_MS = 50;
const CURSOR_THROTTLE_MS = 30;
const SAVE_DEBOUNCE_MS = 1200;

type ExcalidrawElement = {
  id: string;
  version: number;
  [key: string]: unknown;
};

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Merge remote elements with local elements at the element level.
 * For each element, keep whichever has the higher version.
 * Preserves local in-progress edits while accepting remote changes
 * for elements the local user hasn't touched.
 */
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

  // Start with all remote elements
  for (const [id, remote] of remoteMap) {
    const local = localMap.get(id);
    if (local && (local.version ?? 0) >= (remote.version ?? 0)) {
      merged.set(id, local);
    } else {
      merged.set(id, remote);
    }
  }

  // Add local-only elements (newly created locally, not yet on remote)
  for (const [id, local] of localMap) {
    if (!remoteMap.has(id)) {
      merged.set(id, local);
    }
  }

  return Array.from(merged.values());
}

export default function BoardEditor({
  diagramId,
  title,
  userEmail,
  initialElements,
  initialAppState,
}: BoardEditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitTime = useRef(0);
  const lastCursorEmitTime = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
  const applyingRemoteCounter = useRef(0);
  const lastSavedAt = useRef<string | null>(null);

  const cacheKey = `drawhaus_scene_${diagramId}`;

  const initialData = useMemo(() => {
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

  // Clean stale cursors
  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next: Record<string, CursorInfo> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.lastSeen < 5000) next[k] = v;
        }
        return Object.keys(next).length !== Object.keys(prev).length ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut to toggle sidebar
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

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
    socketRef.current = socket;

    function joinRoom() {
      socket.emit("join-room", { roomId: diagramId });
    }

    socket.on("connect", () => {
      setConnectionState("connected");
      setConnectionError(null);
      joinRoom();
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message);
      setConnectionState("error");
      setConnectionError(err.message);
    });

    socket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setConnectionState("disconnected");
    });

    socket.on("room-error", ({ message }: { message: string }) => {
      console.error("Room error:", message);
      setConnectionError(message);
      setConnectionState("error");
    });

    socket.on("room-joined", ({ role }: { role: string }) => {
      setUserRole(role);
      setConnectionError(null);
    });

    socket.on("scene-from-db", ({ elements, appState }: { elements: unknown[]; appState: Record<string, unknown> }) => {
      // On reconnect, only apply DB state if we have no local elements
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
      elements: remoteElements,
      appState,
    }: {
      fromSocketId: string;
      elements: unknown[];
      appState: Record<string, unknown>;
    }) => {
      if (fromSocketId === socket.id) return;

      const localElements = excalidrawApiRef.current?.getSceneElements?.() ?? [];
      const merged = mergeElements(localElements, remoteElements);

      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: merged, appState: { ...appState, collaborators: new Map() } });
      requestAnimationFrame(() => {
        applyingRemoteCounter.current -= 1;
      });
    });

    socket.on("room-presence", ({ users }: { users: PresenceUser[] }) => {
      setPresenceUsers(users);
    });

    socket.on("scene-saved", () => {
      lastSavedAt.current = new Date().toLocaleTimeString();
      setSaveState("saved");
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [diagramId]);

  const canEdit = userRole === "owner" || userRole === "editor";

  const persistScene = useCallback(
    async (elements: unknown[], appState: Record<string, unknown>) => {
      setSaveState("saving");
      try {
        const sanitizedAppState = jsonSafe({
          ...appState,
          collaborators: undefined,
        });
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
          return;
        }

        const response = await fetch(`/api/diagrams/${diagramId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            elements: jsonSafe(elements),
            appState: sanitizedAppState,
          }),
        });
        if (!response.ok) {
          setSaveState("error");
          return;
        }
        lastSavedAt.current = new Date().toLocaleTimeString();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [diagramId, cacheKey]
  );

  const onChange = useCallback(
    (elements: readonly unknown[], appState: Record<string, unknown>) => {
      if (applyingRemoteCounter.current > 0) return;
      if (!canEdit) return;

      setSaveState("pending");

      // Strip non-serializable collaborators Map before sending
      const { collaborators: _c, ...cleanAppState } = appState;

      // Throttle scene-update emissions
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

      // Debounce save to DB
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        persistScene([...elements], appState);
      }, SAVE_DEBOUNCE_MS);
    },
    [diagramId, persistScene, canEdit]
  );

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

  const connectionBadge = connectionState !== "connected" ? (
    <div className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${
      connectionState === "error"
        ? "bg-red-100 text-red-700"
        : connectionState === "disconnected"
          ? "bg-amber-100 text-amber-700"
          : "bg-blue-100 text-blue-700"
    }`}>
      {connectionState === "error"
        ? connectionError ?? "Connection error"
        : connectionState === "disconnected"
          ? "Reconnecting..."
          : "Connecting..."}
    </div>
  ) : null;

  return (
    <div className="relative h-screen w-screen">
      {/* Sidebar drawer */}
      <BoardSidebar
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Title - next to Excalidraw menu, matching its style */}
      <div className="pointer-events-none fixed left-16 top-3 z-20 flex items-center gap-3">
        <div className="pointer-events-auto rounded-lg bg-white px-4 py-2 shadow-sm">
          <span className="text-lg font-medium text-[#1b1b1f]">
            {title || "Untitled"}
          </span>
        </div>
        <div className={`pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-medium shadow-sm ${saveColor}`}>
          {saveLabel}
        </div>
        <div className="pointer-events-auto rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[#1b1b1f] shadow-sm">
          {presenceUsers.length || 1} online
        </div>
        {connectionBadge}
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

      {/* Fullscreen Excalidraw canvas */}
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
          }}
          initialData={initialData}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
