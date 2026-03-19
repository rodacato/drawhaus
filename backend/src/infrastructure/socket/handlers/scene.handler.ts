import type { Server, Socket } from "socket.io";
import type { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import type { SyncToDriveUseCase } from "../../../application/use-cases/drive/sync-to-drive";
import type { EditLockChecker } from "../edit-lock-store";
import { type SocketData, canEdit, checkRateLimit, RATE_LIMIT_MAX_SCENE } from "../helpers";
import { logger } from "../../logger";

export function registerSceneHandlers(
  io: Server,
  socket: Socket,
  useCases: { saveScene: SaveSceneUseCase; syncToDrive?: SyncToDriveUseCase },
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

      const targetSceneId = sceneId ?? (socket.data.activeSceneId as string | undefined);
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

        const targetSceneId = sceneId ?? (socket.data.activeSceneId as string | undefined);
        if (!targetSceneId) return;

        await useCases.saveScene.execute(targetSceneId, elements, appState);
        socket.emit("scene-saved", { roomId, sceneId: targetSceneId });

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
