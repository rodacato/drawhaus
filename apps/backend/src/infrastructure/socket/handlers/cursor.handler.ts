import type { Socket, Server } from "socket.io";
import { z } from "zod";
import { type SocketData, checkRateLimit, onEvent, RATE_LIMIT_MAX_CURSOR } from "../helpers";

const cursorMoveSchema = z.object({ roomId: z.string(), x: z.number(), y: z.number() });

const viewportUpdateSchema = z.object({
  roomId: z.string(),
  scrollX: z.number(),
  scrollY: z.number(),
  zoom: z.number(),
});

const requestViewportSchema = z.object({ roomId: z.string(), targetUserId: z.string() });

export function registerCursorHandlers(socket: Socket, io: Server) {
  onEvent(socket, "cursor-move", cursorMoveSchema, ({ roomId, x, y }) => {
    if (!socket.rooms.has(roomId)) return;
    if (!checkRateLimit(socket, "cursor", RATE_LIMIT_MAX_CURSOR)) return;

    const data = socket.data as SocketData;
    socket.volatile.to(roomId).emit("cursor-moved", {
      userId: data.userId,
      name: data.userName,
      x,
      y,
    });
  });

  onEvent(socket, "viewport-update", viewportUpdateSchema, ({ roomId, scrollX, scrollY, zoom }) => {
    if (!socket.rooms.has(roomId)) return;
    if (!checkRateLimit(socket, "viewport", RATE_LIMIT_MAX_CURSOR)) return;

    const data = socket.data as SocketData;
    socket.volatile.to(roomId).emit("viewport-updated", {
      userId: data.userId,
      scrollX,
      scrollY,
      zoom,
    });
  });

  /* ─── request-viewport: ask a specific user to send their viewport ─── */
  onEvent(socket, "request-viewport", requestViewportSchema, async ({ roomId, targetUserId }) => {
    if (!socket.rooms.has(roomId)) return;

    const remoteSockets = await io.in(roomId).fetchSockets();
    for (const s of remoteSockets) {
      const d = s.data as SocketData;
      if (d.userId === targetUserId) {
        s.emit("provide-viewport", { requesterId: (socket.data as SocketData).userId });
        break;
      }
    }
  });
}
