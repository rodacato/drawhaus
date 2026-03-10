export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";
export type PresenceUser = { userId: string; name: string; isGuest?: boolean };
export type PresenceUserWithSelf = PresenceUser & { isSelf?: boolean };
export type CursorInfo = { name: string; x: number; y: number; lastSeen: number };

export type ExcalidrawApi = {
  updateScene: (scene: { elements?: unknown[]; appState?: Record<string, unknown> }) => void;
  getSceneElements: () => readonly unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
};

export type ExcalidrawElement = {
  id: string;
  version: number;
  [key: string]: unknown;
};

export type CommentThread = {
  id: string;
  diagramId: string;
  elementId: string;
  authorId: string;
  authorName: string;
  body: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  replies: CommentReply[];
};

export type CommentReply = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};
