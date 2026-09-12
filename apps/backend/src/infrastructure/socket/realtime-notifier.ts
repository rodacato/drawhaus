import type { Server } from "socket.io";
import type {
  AccessRevoked,
  CommentChanged,
  RealtimeNotifier,
  SceneReplaced,
  SnapshotCreated,
  SnapshotRestored,
} from "../../domain/ports/realtime-notifier";
import { formatReply, formatThread } from "../serializers/comment";
import { formatSnapshot } from "../serializers/snapshot";
import { logger } from "../logger";
import { accessRoom } from "./access-rooms";

const COMMENT_EVENTS = {
  created: "comment-created",
  replied: "comment-replied",
  resolved: "comment-resolved",
  deleted: "comment-deleted",
} as const;

const REVOKED_REASONS = {
  session: "session-ended",
  "user-sessions": "session-ended",
  "share-link": "share-link-revoked",
} as const;

function commentPayload(event: CommentChanged): Record<string, unknown> {
  switch (event.kind) {
    case "created":
    case "resolved":
      return { roomId: event.diagramId, thread: formatThread(event.thread) };
    case "replied":
      return { roomId: event.diagramId, threadId: event.threadId, reply: formatReply(event.reply) };
    case "deleted":
      return { roomId: event.diagramId, threadId: event.threadId };
  }
}

export class SocketIoRealtimeNotifier implements RealtimeNotifier {
  private io: Server | null = null;

  /** The routes are built before the io Server exists; until it does, every notification is dropped. */
  attach(io: Server): void {
    this.io = io;
  }

  sceneReplaced(event: SceneReplaced): void {
    this.emit(event.diagramId, "scene-from-db", {
      elements: event.elements,
      appState: event.appState,
      activeSceneId: event.sceneId,
      revision: event.revision,
    });
  }

  snapshotRestored(event: SnapshotRestored): void {
    const { diagramId, scene } = event;
    this.emit(diagramId, "snapshot-restored", {
      diagramId,
      restoredBy: event.restoredBy,
      snapshotId: event.snapshotId,
    });
    if (scene) {
      this.emit(diagramId, "scene-from-db", {
        elements: scene.elements,
        appState: scene.appState,
        activeSceneId: scene.sceneId,
        revision: scene.revision,
      });
    }
    this.emit(diagramId, "snapshot-created", { diagramId });
  }

  snapshotCreated(event: SnapshotCreated): void {
    this.emit(event.diagramId, "snapshot-created", {
      diagramId: event.diagramId,
      snapshot: formatSnapshot(event.snapshot),
    });
  }

  commentChanged(event: CommentChanged): void {
    this.emit(event.diagramId, COMMENT_EVENTS[event.kind], commentPayload(event));
  }

  accessRevoked(event: AccessRevoked): void {
    if (!this.io) return;
    const room = accessRoom(event);
    try {
      this.io.to(room).emit("access-revoked", { reason: REVOKED_REASONS[event.kind] });
      this.io.in(room).disconnectSockets(true);
    } catch (err) {
      logger.warn({ err, kind: event.kind }, "revoked sockets not disconnected");
    }
  }

  // A write that already committed must not fail on its notification.
  private emit(room: string, event: string, payload: unknown): void {
    if (!this.io) return;
    try {
      this.io.to(room).emit(event, payload);
    } catch (err) {
      logger.warn({ err, event, room }, "realtime notification dropped");
    }
  }
}
