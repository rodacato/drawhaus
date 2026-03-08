import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { JoinRoomUseCase } from "../../application/use-cases/realtime/join-room";
import type { JoinRoomGuestUseCase } from "../../application/use-cases/realtime/join-room-guest";
import type { SaveSceneUseCase } from "../../application/use-cases/realtime/save-scene";
import { registerRoomHandlers } from "./handlers/room.handler";
import { registerSceneHandlers } from "./handlers/scene.handler";
import { registerCursorHandlers } from "./handlers/cursor.handler";
import { config } from "../config";

export function setupSocketServer(
  httpServer: HttpServer,
  useCases: {
    joinRoom: JoinRoomUseCase;
    joinRoomGuest: JoinRoomGuestUseCase;
    saveScene: SaveSceneUseCase;
  },
): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.data.roomRoles = {};
    socket.data.isGuest = false;

    registerRoomHandlers(io, socket, {
      joinRoom: useCases.joinRoom,
      joinRoomGuest: useCases.joinRoomGuest,
    });
    registerSceneHandlers(io, socket, {
      saveScene: useCases.saveScene,
    });
    registerCursorHandlers(socket);
  });

  return io;
}
