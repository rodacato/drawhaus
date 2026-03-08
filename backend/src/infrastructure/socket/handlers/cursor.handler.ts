import type { Socket } from "socket.io";
import { type SocketData, checkRateLimit, RATE_LIMIT_MAX_CURSOR } from "../helpers";

export function registerCursorHandlers(socket: Socket) {
  socket.on(
    "cursor-move",
    ({ roomId, x, y }: { roomId: string; x: number; y: number }) => {
      if (!socket.rooms.has(roomId)) return;
      if (!checkRateLimit(socket, "cursor", RATE_LIMIT_MAX_CURSOR)) return;

      const data = socket.data as SocketData;
      socket.to(roomId).emit("cursor-moved", {
        userId: data.userId,
        name: data.userName,
        x,
        y,
      });
    },
  );

  socket.on(
    "viewport-update",
    ({
      roomId,
      scrollX,
      scrollY,
      zoom,
    }: {
      roomId: string;
      scrollX: number;
      scrollY: number;
      zoom: number;
    }) => {
      if (!socket.rooms.has(roomId)) return;
      if (!checkRateLimit(socket, "viewport", RATE_LIMIT_MAX_CURSOR)) return;

      const data = socket.data as SocketData;
      socket.to(roomId).emit("viewport-updated", {
        userId: data.userId,
        scrollX,
        scrollY,
        zoom,
      });
    },
  );
}
