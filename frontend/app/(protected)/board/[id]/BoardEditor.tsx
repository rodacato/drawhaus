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

const THROTTLE_MS = 100;
const SAVE_DEBOUNCE_MS = 1200;

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitTime = useRef(0);
  const socketRef = useRef<Socket | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
  const applyingRemoteCounter = useRef(0);
  const lastSavedAt = useRef<string | null>(null);

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

    socket.on("scene-saved", () => {
      lastSavedAt.current = new Date().toLocaleTimeString();
      setSaveState("saved");
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
        if (socketRef.current?.connected) {
          socketRef.current.emit("save-scene", {
            roomId: diagramId,
            elements: jsonSafe(elements),
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
    [diagramId]
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

      {/* Fullscreen Excalidraw canvas */}
      <div className="h-full w-full">
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
