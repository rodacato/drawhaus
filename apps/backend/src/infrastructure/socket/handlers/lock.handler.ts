import type { Server, Socket } from "socket.io";
import type { EditLockService } from "../edit-lock-store";
import { type SocketData, canEdit, emitLockStatus } from "../helpers";
import { logger } from "../../logger";

export function registerLockHandlers(
  io: Server,
  socket: Socket,
  lockStore: EditLockService,
) {
  socket.on("request-edit-lock", ({ roomId }: { roomId: string }) => {
    if (!socket.rooms.has(roomId)) return;
    if (!canEdit(socket, roomId)) return;

    const userId = (socket.data as SocketData).userId;
    const userName = (socket.data as SocketData).userName;

    const result = lockStore.tryAcquire(roomId, userId, userName, socket.id);

    if (result.acquired) {
      socket.emit("edit-lock-acquired", {
        roomId,
        holder: { userId, userName },
      });
      emitLockStatus(io, roomId, lockStore);
    } else if (result.queued) {
      socket.emit("edit-lock-queued", {
        roomId,
        position: result.position,
        holder: { userId: result.holder.userId, userName: result.holder.userName },
      });
    } else {
      // Backwards compat: emit denied for clients that don't support queue yet
      socket.emit("edit-lock-denied", {
        roomId,
        holderName: result.holder?.userName ?? "someone",
        holderUserId: result.holder?.userId ?? null,
      });
    }
  });

  socket.on("release-edit-lock", ({ roomId }: { roomId: string }) => {
    if (!socket.rooms.has(roomId)) return;
    const userId = (socket.data as SocketData).userId;
    if (lockStore.releaseLock(roomId, userId)) {
      emitLockStatus(io, roomId, lockStore);
      logger.info({ roomId, userId }, "edit lock released");
    }
  });
}
