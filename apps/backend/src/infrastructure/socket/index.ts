import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import msgpackParser from "socket.io-msgpack-parser";
import type { JoinRoomUseCase } from "../../application/use-cases/realtime/join-room";
import type { JoinRoomGuestUseCase } from "../../application/use-cases/realtime/join-room-guest";
import type { SaveSceneUseCase } from "../../application/use-cases/realtime/save-scene";
import type { SyncToDriveUseCase } from "../../application/use-cases/drive/sync-to-drive";
import type { CreateCommentUseCase } from "../../application/use-cases/comments/create-comment";
import type { ReplyCommentUseCase } from "../../application/use-cases/comments/reply-comment";
import type { ResolveCommentUseCase } from "../../application/use-cases/comments/resolve-comment";
import type { DeleteCommentUseCase } from "../../application/use-cases/comments/delete-comment";
import type { CreateSnapshotUseCase } from "../../application/use-cases/snapshots/create-snapshot";
import { registerRoomHandlers } from "./handlers/room.handler";
import { registerSceneHandlers } from "./handlers/scene.handler";
import { registerCursorHandlers } from "./handlers/cursor.handler";
import { registerCommentHandlers } from "./handlers/comment.handler";
import { registerLockHandlers } from "./handlers/lock.handler";
import { EditLockStore } from "./edit-lock-store";
import { config } from "../config";
import { attachRedisAdapter } from "./redis-adapter";

export async function setupSocketServer(
  httpServer: HttpServer,
  useCases: {
    joinRoom: JoinRoomUseCase;
    joinRoomGuest: JoinRoomGuestUseCase;
    saveScene: SaveSceneUseCase;
    syncToDrive: SyncToDriveUseCase;
    createComment: CreateCommentUseCase;
    replyComment: ReplyCommentUseCase;
    resolveComment: ResolveCommentUseCase;
    deleteComment: DeleteCommentUseCase;
    createSnapshot: CreateSnapshotUseCase;
  },
): Promise<Server> {
  const io = new Server(httpServer, {
    parser: msgpackParser,
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
    perMessageDeflate: {
      threshold: 1024, // only compress messages larger than 1KB
      zlibDeflateOptions: { level: 6 },
    },
  });

  await attachRedisAdapter(io);

  const lockStore = new EditLockStore();
  lockStore.setOnRelease((diagramId) => {
    // On inactivity release, just clear the lock — don't auto-assign
    // (auto-assign on disconnect only, to avoid acquire/release loops)
    io.to(diagramId).emit("edit-lock-status", {
      roomId: diagramId,
      holder: null,
    });
  });

  io.on("connection", (socket) => {
    socket.data.roomRoles = {};
    socket.data.isGuest = false;

    registerRoomHandlers(io, socket, {
      joinRoom: useCases.joinRoom,
      joinRoomGuest: useCases.joinRoomGuest,
      createSnapshot: useCases.createSnapshot,
    }, lockStore);
    registerSceneHandlers(io, socket, {
      saveScene: useCases.saveScene,
      syncToDrive: useCases.syncToDrive,
      createSnapshot: useCases.createSnapshot,
    }, lockStore);
    registerLockHandlers(io, socket, lockStore);
    registerCursorHandlers(socket, io);
    registerCommentHandlers(io, socket, {
      createComment: useCases.createComment,
      replyComment: useCases.replyComment,
      resolveComment: useCases.resolveComment,
      deleteComment: useCases.deleteComment,
    });
  });

  return io;
}
