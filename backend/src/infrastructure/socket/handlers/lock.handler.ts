import type { Server, Socket } from "socket.io";
import type { EditLockStore } from "../edit-lock-store";
import { type SocketData, canEdit } from "../helpers";
import { logger } from "../../logger";

function emitLockStatus(io: Server, roomId: string, lockStore: EditLockStore) {
  const holder = lockStore.getLock(roomId);
  io.to(roomId).emit("edit-lock-status", {
    roomId,
    holder: holder ? { userId: holder.userId, userName: holder.userName } : null,
  });
}

export function registerLockHandlers(
  io: Server,
  socket: Socket,
  lockStore: EditLockStore,
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
    } else {
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
