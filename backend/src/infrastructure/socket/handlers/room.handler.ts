import type { Server, Socket } from "socket.io";
import { parse } from "cookie";
import type { JoinRoomUseCase } from "../../../application/use-cases/realtime/join-room";
import type { JoinRoomGuestUseCase } from "../../../application/use-cases/realtime/join-room-guest";
import { type SocketData, getRoomPresenceUsers } from "../helpers";
import { config } from "../../config";
import { logger } from "../../logger";

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  useCases: { joinRoom: JoinRoomUseCase; joinRoomGuest: JoinRoomGuestUseCase },
) {
  socket.on("join-room", async ({ roomId }: { roomId: string }) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const token = cookieHeader ? (parse(cookieHeader)[config.cookieName] ?? null) : null;

      const result = await useCases.joinRoom.execute(token, roomId);

      socket.data.userId = result.user.id;
      socket.data.userName = result.user.name;
      socket.data.userEmail = result.user.email;
      socket.data.isGuest = false;
      (socket.data.roomRoles as Record<string, string>)[roomId] = result.role;

      socket.join(roomId);

      socket.emit("scene-from-db", {
        elements: result.elements,
        appState: result.appState,
      });

      socket.emit("room-joined", { roomId, role: result.role, userId: result.user.id });

      io.to(roomId).emit("room-presence", {
        roomId,
        users: getRoomPresenceUsers(io, roomId),
      });
    } catch (error: unknown) {
      logger.error(error, "join-room failed");
      socket.emit("room-error", { message: "Join failed" });
    }
  });

  socket.on("join-room-guest", async ({
    shareToken,
    guestName,
  }: {
    shareToken: string;
    guestName: string;
  }) => {
    try {
      const name = (guestName || "").trim().slice(0, 50) || "Guest";
      const result = await useCases.joinRoomGuest.execute(shareToken);

      const roomId = result.diagramId;
      const guestId = `guest_${socket.id}`;

      socket.data.userId = guestId;
      socket.data.userName = name;
      socket.data.userEmail = "";
      socket.data.isGuest = true;
      (socket.data.roomRoles as Record<string, string>)[roomId] = result.role;

      socket.join(roomId);

      socket.emit("scene-from-db", {
        elements: result.elements,
        appState: result.appState,
      });

      socket.emit("room-joined", { roomId, role: result.role, userId: guestId });

      io.to(roomId).emit("room-presence", {
        roomId,
        users: getRoomPresenceUsers(io, roomId),
      });
    } catch (error: unknown) {
      logger.error(error, "join-room-guest failed");
      socket.emit("room-error", { message: "Invalid or expired share link" });
    }
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;

      const futureUsers = getRoomPresenceUsers(io, roomId).filter(
        (u) =>
          u.userId !== (socket.data as SocketData).userId ||
          Array.from(io.sockets.adapter.rooms.get(roomId) ?? []).some(
            (sid) =>
              sid !== socket.id &&
              (io.sockets.sockets.get(sid)?.data as SocketData)?.userId ===
                (socket.data as SocketData).userId,
          ),
      );

      socket.to(roomId).emit("room-presence", { roomId, users: futureUsers });
      socket.to(roomId).emit("cursor-left", { userId: (socket.data as SocketData).userId });
    }
  });
}
