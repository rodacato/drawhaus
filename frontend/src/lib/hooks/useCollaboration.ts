import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createSocket } from "@/lib/services/socket";
import { mergeElements, jsonSafe, THROTTLE_MS, CURSOR_THROTTLE_MS, SAVE_DEBOUNCE_MS } from "@/lib/collaboration";
import type { SaveState, ConnectionState, PresenceUser, CursorInfo, ExcalidrawApi, PresenceUserWithSelf } from "@/lib/types";
import { diagramsApi } from "@/api/diagrams";
import { api } from "@/api/client";

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

export type SceneInfo = { id: string; name: string; sortOrder: number };

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
  scenes: SceneInfo[];
  activeSceneId: string | null;
  switchScene: (sceneId: string) => void;
  createScene: (name?: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  renameScene: (sceneId: string, name: string) => Promise<void>;
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
  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const activeSceneIdRef = useRef<string | null>(null);

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

  // Keep refs in sync for use inside socket callbacks
  useEffect(() => {
    followingUserIdRef.current = followingUserId;
  }, [followingUserId]);
  useEffect(() => {
    activeSceneIdRef.current = activeSceneId;
  }, [activeSceneId]);

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

    socket.on("scene-from-db", ({
      elements,
      scenes: scenesList,
      activeSceneId: sceneId,
    }: {
      elements: unknown[];
      scenes?: SceneInfo[];
      activeSceneId?: string | null;
    }) => {
      if (scenesList) setScenes(scenesList);
      if (sceneId) setActiveSceneId(sceneId);

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

  const generateThumbnail = useCallback(async (): Promise<void> => {
    const apiRef = excalidrawApiRef.current;
    if (!apiRef) return;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const els = apiRef.getSceneElements() as Parameters<typeof exportToBlob>[0]["elements"];
      if (els.length === 0) return;
      const blob = await exportToBlob({
        elements: els,
        appState: { ...apiRef.getAppState(), exportWithDarkMode: false } as Parameters<typeof exportToBlob>[0]["appState"],
        files: apiRef.getFiles() as Parameters<typeof exportToBlob>[0]["files"],
        maxWidthOrHeight: 300,
      });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      await diagramsApi.updateThumbnail(diagramId, dataUrl);
    } catch { /* thumbnail is best-effort */ }
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
            sceneId: activeSceneIdRef.current,
            elements: safeElements,
            appState: sanitizedAppState,
          });
          generateThumbnail();
          return;
        }

        await diagramsApi.update(diagramId, { elements: safeElements, appState: sanitizedAppState });
        lastSavedAt.current = new Date().toLocaleTimeString();
        setSaveState("saved");
        generateThumbnail();
      } catch {
        setSaveState("error");
      }
    },
    [diagramId, cacheKey, generateThumbnail]
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
          sceneId: activeSceneIdRef.current,
          elements: [...elements],
        });
      } else if (!throttleTimer.current) {
        throttleTimer.current = setTimeout(() => {
          throttleTimer.current = null;
          lastEmitTime.current = Date.now();
          socketRef.current?.emit("scene-update", {
            roomId: diagramId,
            sceneId: activeSceneIdRef.current,
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

  const onExcalidrawApi = useCallback((excalidrawApi: ExcalidrawApi) => {
    excalidrawApiRef.current = excalidrawApi;
    if (pendingSceneRef.current) {
      const pending = pendingSceneRef.current;
      pendingSceneRef.current = null;
      applyingRemoteCounter.current += 1;
      excalidrawApi.updateScene({ elements: pending.elements });
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

  const switchScene = useCallback(async (sceneId: string) => {
    if (sceneId === activeSceneIdRef.current) return;

    // Tell socket to switch sub-rooms
    socketRef.current?.emit("switch-scene", { roomId: diagramId, sceneId });
    setActiveSceneId(sceneId);

    // Fetch scene data from REST
    try {
      const data = await api.get(`/api/diagrams/${diagramId}/scenes/${sceneId}`).then(r => r.data);
      const scene = data.scene as { elements: unknown[]; appState: Record<string, unknown> };
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({
        elements: scene.elements ?? [],
      });
      requestAnimationFrame(() => { applyingRemoteCounter.current -= 1; });
    } catch { /* ignore */ }
  }, [diagramId]);

  const createScene = useCallback(async (name?: string) => {
    try {
      const data = await api.post(`/api/diagrams/${diagramId}/scenes`, { name }).then(r => r.data);
      const newScene = data.scene as SceneInfo;
      setScenes((prev) => [...prev, newScene]);
      // Switch to the new scene
      switchScene(newScene.id);
      // Load empty canvas for the new scene
      applyingRemoteCounter.current += 1;
      excalidrawApiRef.current?.updateScene({ elements: [] });
      requestAnimationFrame(() => { applyingRemoteCounter.current -= 1; });
    } catch { /* ignore */ }
  }, [diagramId, switchScene]);

  const deleteScene = useCallback(async (sceneId: string) => {
    try {
      await api.delete(`/api/diagrams/${diagramId}/scenes/${sceneId}`);
      setScenes((prev) => {
        const updated = prev.filter((s) => s.id !== sceneId);
        // If we deleted the active scene, switch to the first remaining
        if (activeSceneIdRef.current === sceneId && updated.length > 0) {
          switchScene(updated[0].id);
        }
        return updated;
      });
    } catch { /* ignore */ }
  }, [diagramId, switchScene]);

  const renameScene = useCallback(async (sceneId: string, name: string) => {
    try {
      await api.patch(`/api/diagrams/${diagramId}/scenes/${sceneId}`, { name });
      setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, name } : s));
    } catch { /* ignore */ }
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
    scenes,
    activeSceneId,
    switchScene,
    createScene,
    deleteScene,
    renameScene,
    excalidrawApiRef,
    onExcalidrawApi,
    onChange,
    onPointerMove,
  };
}
