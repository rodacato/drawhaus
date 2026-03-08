import type { Server, Socket } from "socket.io";
import type { SaveSceneUseCase } from "../../../application/use-cases/realtime/save-scene";
import { type SocketData, canEdit, checkRateLimit, RATE_LIMIT_MAX_SCENE } from "../helpers";
import { logger } from "../../logger";

export function registerSceneHandlers(
  io: Server,
  socket: Socket,
  useCases: { saveScene: SaveSceneUseCase },
) {
  socket.on(
    "scene-update",
    ({ roomId, sceneId, elements }: { roomId: string; sceneId?: string; elements: unknown[] }) => {
      if (!socket.rooms.has(roomId)) return;
      if (!canEdit(socket, roomId)) return;
      if (!checkRateLimit(socket, "scene", RATE_LIMIT_MAX_SCENE)) return;

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

        const targetSceneId = sceneId ?? (socket.data.activeSceneId as string | undefined);
        if (!targetSceneId) return;

        await useCases.saveScene.execute(targetSceneId, elements, appState);
        socket.emit("scene-saved", { roomId, sceneId: targetSceneId });
      } catch (error: unknown) {
        logger.error(error, "save-scene failed");
        socket.emit("room-error", { message: "Save failed" });
      }
    },
  );
}
