import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "../services/socket";
import { mergeElements, jsonSafe, THROTTLE_MS, CURSOR_THROTTLE_MS, SAVE_DEBOUNCE_MS } from "../collaboration";
import type { SaveState, ConnectionState, PresenceUser, CursorInfo, ExcalidrawApi, PresenceUserWithSelf } from "../types";

export type JoinMode =
  | { type: "authenticated"; roomId: string }
  | { type: "guest"; shareToken: string; guestName: string };

export type CollaborationOptions = {
  diagramId: string;
  canEdit: boolean;
  joinMode: JoinMode;
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
};

export type CollaborationState = {
  saveState: SaveState;
  connectionState: ConnectionState;
  connectionError: string | null;
  presenceUsers: PresenceUserWithSelf[];
  cursors: Record<string, CursorInfo>;
  userRole: string | null;
  followingUserId: string | null;
  setFollowingUserId: (id: string | null) => void;
  toolbarOpen: boolean;
  setToolbarOpen: (open: boolean) => void;
  initialData: { elements: unknown[]; appState: Record<string, unknown> };
  canEdit: boolean;
  saveLabel: string;
  saveColor: string;
  lastSavedAt: string | null;
  // Refs & callbacks for Excalidraw integration
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  onExcalidrawApi: (api: ExcalidrawApi) => void;
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  onPointerMove: (e: { clientX: number; clientY: number }) => void;
};

export function useCollaboration({
  diagramId,
  canEdit,
  joinMode,
  initialElements,
  initialAppState,
}: CollaborationOptions): CollaborationState {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [cursors, setCursors] = useState<Record<string, CursorInfo>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [followingUserId, setFollowingUserId] = useState<string | null>(null);
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitTime = useRef(0);
  const lastCursorEmitTime = useRef(0);
  const lastViewportEmitTime = useRef(0);
  const followingUserIdRef = useRef<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const excalidrawApiRef = useRef<ExcalidrawApi | null>(null);
  const applyingRemoteCounter = useRef(0);
  const lastSavedAt = useRef<string | null>(null);
  const pendingSceneRef = useRef<{ elements: unknown[] } | null>(null);

  const cacheKey = `drawhaus_scene_${diagramId}`;

  // Keep ref in sync for use inside socket callbacks
  useEffect(() => {
    followingUserIdRef.current = followingUserId;
  }, [followingUserId]);

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

  // Cleanup timers on unmount
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

  // Stop following if user leaves
  useEffect(() => {
    if (followingUserId && !presenceUsers.some((u) => u.userId === followingUserId)) {
      setFollowingUserId(null);
    }
  }, [presenceUsers, followingUserId]);

  // Socket connection & event handlers
  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    function joinRoom() {
      if (joinMode.type === "authenticated") {
        socket.emit("join-room", { roomId: joinMode.roomId });
      } else {
        socket.emit("join-room-guest", { shareToken: joinMode.shareToken, guestName: joinMode.guestName });
      }
    }

    socket.on("connect", () => {
      setConnectionState("connected");
      setConnectionError(null);
      joinRoom();
    });

    socket.on("connect_error", (err) => {
      console.warn("Socket connect_error:", err.message);
      setConnectionState("error");
      setConnectionError(err.message);
    });

    socket.on("disconnect", (reason) => {
      console.warn("Socket disconnected:", reason);
      setConnectionState("disconnected");
    });

    socket.on("room-error", ({ message }: { message: string }) => {
      console.warn("Room error:", message);
      setConnectionError(message);
      setConnectionState("error");
    });

    socket.on("room-joined", ({ role, userId }: { role?: string; userId?: string }) => {
      if (role) setUserRole(role);
      if (userId) setSelfUserId(userId);
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

    socket.on("viewport-updated", ({
      userId,
      scrollX,
      scrollY,
      zoom,
    }: {
      userId: string;
      scrollX: number;
      scrollY: number;
      zoom: number;
    }) => {
      if (followingUserIdRef.current !== userId) return;
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({
        appState: { scrollX, scrollY, zoom: { value: zoom } },
      });
      requestAnimationFrame(() => {
        applyingRemoteCounter.current -= 1;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // joinMode fields are stable per mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId]);

  const persistScene = useCallback(
    async (elements: unknown[], appState: Record<string, unknown>) => {
      setSaveState("saving");
      try {
        const sanitizedAppState = jsonSafe({ ...appState, collaborators: undefined });
        const safeElements = jsonSafe(elements);

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
          body: JSON.stringify({ elements: safeElements, appState: sanitizedAppState }),
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

      const now = Date.now();
      if (!followingUserIdRef.current) {
        if (now - lastViewportEmitTime.current >= CURSOR_THROTTLE_MS) {
          lastViewportEmitTime.current = now;
          const zoom = (appState.zoom as { value: number })?.value ?? 1;
          socketRef.current?.emit("viewport-update", {
            roomId: diagramId,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
            zoom,
          });
        }
      }

      if (!canEdit) return;

      setSaveState("pending");
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

  const onExcalidrawApi = useCallback((api: ExcalidrawApi) => {
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
  }, []);

  const onPointerMove = useCallback((e: { clientX: number; clientY: number }) => {
    const now = Date.now();
    if (now - lastCursorEmitTime.current >= CURSOR_THROTTLE_MS) {
      lastCursorEmitTime.current = now;
      socketRef.current?.emit("cursor-move", {
        roomId: diagramId,
        x: e.clientX,
        y: e.clientY,
      });
    }
  }, [diagramId]);

  const mappedPresenceUsers: PresenceUserWithSelf[] = presenceUsers.map((u) => ({
    ...u,
    isSelf: u.userId === selfUserId,
  }));

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

  return {
    saveState,
    connectionState,
    connectionError,
    presenceUsers: mappedPresenceUsers,
    cursors,
    userRole,
    followingUserId,
    setFollowingUserId,
    toolbarOpen,
    setToolbarOpen,
    initialData,
    canEdit,
    saveLabel,
    saveColor,
    lastSavedAt: lastSavedAt.current,
    excalidrawApiRef,
    onExcalidrawApi,
    onChange,
    onPointerMove,
  };
}
