import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { type SocketData, canEdit, onEvent } from "../helpers";

const roomSchema = z.object({ roomId: z.string() });

/**
 * Lock handlers are now no-ops for backwards compatibility.
 * Concurrent editing replaced the global edit lock.
 * `request-edit-lock` always responds with `acquired: true`.
 * Raise hand signaling is preserved (not tied to locking).
 */
export function registerLockHandlers(io: Server, socket: Socket) {
  onEvent(socket, "request-edit-lock", roomSchema, ({ roomId }) => {
    if (!socket.rooms.has(roomId)) return;
    if (!canEdit(socket, roomId)) return;

    const userId = (socket.data as SocketData).userId;
    const userName = (socket.data as SocketData).userName;

    // Always grant — concurrent editing handles conflicts via merge
    socket.emit("edit-lock-acquired", {
      roomId,
      holder: { userId, userName },
    });
    io.to(roomId).emit("edit-lock-status", {
      roomId,
      holder: { userId, userName },
    });
  });

  onEvent(socket, "release-edit-lock", roomSchema, ({ roomId }) => {
    if (!socket.rooms.has(roomId)) return;
    io.to(roomId).emit("edit-lock-status", { roomId, holder: null });
  });

  onEvent(socket, "raise-hand", roomSchema, ({ roomId }) => {
    if (!socket.rooms.has(roomId)) return;
    const data = socket.data as SocketData;
    if (!data.userId) return;
    socket.to(roomId).emit("hand-raised", {
      roomId,
      userId: data.userId,
      userName: data.userName,
    });
  });

  onEvent(socket, "lower-hand", roomSchema, ({ roomId }) => {
    if (!socket.rooms.has(roomId)) return;
    const data = socket.data as SocketData;
    if (!data.userId) return;
    socket.to(roomId).emit("hand-lowered", {
      roomId,
      userId: data.userId,
    });
  });
}
