import type { Server, Socket } from "socket.io";
import type { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import type { SyncToDriveUseCase } from "../../../application/use-cases/drive/sync-to-drive";
import type { CreateSnapshotUseCase } from "../../../application/use-cases/snapshots/create-snapshot";
import type { EditLockChecker } from "../edit-lock-store";
import { type SocketData, canEdit, checkRateLimit, RATE_LIMIT_MAX_SCENE } from "../helpers";
import { logger } from "../../logger";

const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const lastIntervalSnapshot = new Map<string, number>();

export function registerSceneHandlers(
  io: Server,
  socket: Socket,
  useCases: { saveScene: SaveSceneUseCase; syncToDrive?: SyncToDriveUseCase; createSnapshot: CreateSnapshotUseCase },
  lockChecker: EditLockChecker,
) {
  socket.on(
    "scene-update",
    ({ roomId, sceneId, elements }: { roomId: string; sceneId?: string; elements: unknown[] }) => {
      if (!socket.rooms.has(roomId)) return;
      if (!canEdit(socket, roomId)) return;
      if (!checkRateLimit(socket, "scene", RATE_LIMIT_MAX_SCENE)) return;

      const userId = (socket.data as SocketData).userId;
      if (!lockChecker.hasLock(roomId, userId)) return;
      lockChecker.touchLock(roomId, userId);

      const targetSceneId = sceneId ?? (socket.data as SocketData).activeSceneId;
      const broadcastRoom = targetSceneId ? `${roomId}:${targetSceneId}` : roomId;

      socket.to(broadcastRoom).emit("scene-updated", {
        roomId,
        sceneId: targetSceneId,
        fromUserId: (socket.data as SocketData).userId,
        fromSocketId: socket.id,
        elements,
      });
    },
  );

  socket.on(
    "save-scene",
    async ({
      roomId,
      sceneId,
      elements,
      appState,
    }: {
      roomId: string;
      sceneId?: string;
      elements: unknown[];
      appState: Record<string, unknown>;
    }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!canEdit(socket, roomId)) return;

        const saveUserId = (socket.data as SocketData).userId;
        if (!lockChecker.hasLock(roomId, saveUserId)) return;
        lockChecker.touchLock(roomId, saveUserId);

        const targetSceneId = sceneId ?? (socket.data as SocketData).activeSceneId;
        if (!targetSceneId) return;

        await useCases.saveScene.execute(targetSceneId, elements, appState);
        socket.emit("scene-saved", { roomId, sceneId: targetSceneId });

        // Fire-and-forget: interval snapshot every 10 minutes
        const now = Date.now();
        const lastTs = lastIntervalSnapshot.get(roomId) ?? 0;
        if (now - lastTs >= SNAPSHOT_INTERVAL_MS) {
          lastIntervalSnapshot.set(roomId, now);
          const sockets = await io.in(roomId).fetchSockets();
          const uniqueIds = new Set(sockets.map((s) => (s.data as SocketData).userId).filter(Boolean));
          useCases.createSnapshot.execute(roomId, saveUserId, "interval", undefined, uniqueIds.size || 1)
            .then((snap) => {
              if (snap) {
                io.to(roomId).emit("snapshot-created", {
                  diagramId: roomId,
                  snapshot: { id: snap.id, trigger: snap.trigger, name: snap.name, createdBy: snap.createdBy, createdByName: snap.createdByName, activeUsers: snap.activeUsers, createdAt: snap.createdAt.toISOString() },
                });
              }
            })
            .catch(() => {});
        }

        // Fire-and-forget: sync to Google Drive if enabled
        const userId = saveUserId;
        if (useCases.syncToDrive && userId) {
          useCases.syncToDrive
            .execute(userId, roomId, targetSceneId, elements, appState)
            .then((result) => {
              if (result.synced || result.error) {
                socket.emit("drive-sync-status", {
                  sceneId: targetSceneId,
                  synced: result.synced,
                  error: result.error,
                });
              }
            })
            .catch(() => { /* already logged inside SyncToDriveUseCase */ });
        }
      } catch (error: unknown) {
        logger.error(error, "save-scene failed");
        socket.emit("room-error", { message: "Save failed" });
      }
    },
  );
}
