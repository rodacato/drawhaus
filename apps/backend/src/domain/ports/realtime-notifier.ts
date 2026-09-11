import type { CommentReply, CommentThread } from "../entities/comment";
import type { DiagramSnapshot } from "../entities/diagram-snapshot";

export type SceneReplaced = {
  diagramId: string;
  sceneId: string;
  revision: number;
  elements: unknown[];
  appState: Record<string, unknown>;
};

export type SnapshotRestored = {
  diagramId: string;
  snapshotId: string;
  restoredBy: { userId: string; userName: string };
  scene: {
    sceneId: string;
    revision: number | null;
    elements: unknown[];
    appState: Record<string, unknown>;
  } | null;
};

export type SnapshotCreated = {
  diagramId: string;
  snapshot: DiagramSnapshot;
};

export type CommentChanged =
  | { kind: "created"; diagramId: string; thread: CommentThread }
  | { kind: "replied"; diagramId: string; threadId: string; reply: CommentReply }
  | { kind: "resolved"; diagramId: string; thread: CommentThread }
  | { kind: "deleted"; diagramId: string; threadId: string };

/**
 * Tells the boards that have a diagram open about a write that did not come from their room,
 * so they stop editing a scene the server has already replaced (ADR-027).
 */
export interface RealtimeNotifier {
  sceneReplaced(event: SceneReplaced): void;
  snapshotRestored(event: SnapshotRestored): void;
  snapshotCreated(event: SnapshotCreated): void;
  commentChanged(event: CommentChanged): void;
}
