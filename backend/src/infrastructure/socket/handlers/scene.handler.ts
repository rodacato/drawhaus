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
    ({ roomId, elements }: { roomId: string; elements: unknown[] }) => {
      if (!socket.rooms.has(roomId)) return;
      if (!canEdit(socket, roomId)) return;
      if (!checkRateLimit(socket, "scene", RATE_LIMIT_MAX_SCENE)) return;

      socket.to(roomId).emit("scene-updated", {
        roomId,
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
      elements,
      appState,
    }: {
      roomId: string;
      elements: unknown[];
      appState: Record<string, unknown>;
    }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!canEdit(socket, roomId)) return;

        await useCases.saveScene.execute(roomId, elements, appState);
        socket.emit("scene-saved", { roomId });
      } catch (error: unknown) {
        logger.error(error, "save-scene failed");
        socket.emit("room-error", { message: "Save failed" });
      }
    },
  );
}
