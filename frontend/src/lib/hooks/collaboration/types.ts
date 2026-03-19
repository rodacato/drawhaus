import type { SaveState, ConnectionState, PresenceUser, CursorInfo, ExcalidrawApi, PresenceUserWithSelf } from "@/lib/types";
import type { CanvasPrefs } from "@/lib/hooks/useCanvasPrefs";

export type JoinMode =
  | { type: "authenticated"; roomId: string }
  | { type: "guest"; shareToken: string; guestName: string };

export type CollaborationOptions = {
  diagramId: string;
  canEdit: boolean;
  joinMode: JoinMode;
  initialElements: unknown[];
  initialAppState: Record<string, unknown>;
  canvasPrefs: CanvasPrefs;
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
  switchingScene: boolean;
  switchScene: (sceneId: string) => void;
  createScene: (name?: string) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  renameScene: (sceneId: string, name: string) => Promise<void>;
  flushSave: () => Promise<void>;
  excalidrawApiRef: React.MutableRefObject<ExcalidrawApi | null>;
  socketRef: React.MutableRefObject<import("socket.io-client").Socket | null>;
  onExcalidrawApi: (api: ExcalidrawApi) => void;
  onChange: (elements: readonly unknown[], appState: Record<string, unknown>) => void;
  onPointerMove: (e: { clientX: number; clientY: number }) => void;
};
