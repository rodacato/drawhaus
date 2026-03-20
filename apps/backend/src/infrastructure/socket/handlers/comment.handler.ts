import type { Server, Socket } from "socket.io";
import type { CreateCommentUseCase } from "../../../application/use-cases/comments/create-comment";
import type { ReplyCommentUseCase } from "../../../application/use-cases/comments/reply-comment";
import type { ResolveCommentUseCase } from "../../../application/use-cases/comments/resolve-comment";
import type { DeleteCommentUseCase } from "../../../application/use-cases/comments/delete-comment";
import type { SocketData } from "../helpers";
import { checkRateLimit } from "../helpers";
import { logger } from "../../logger";

const RATE_LIMIT_MAX_COMMENT = 10;

export function registerCommentHandlers(
  _io: Server,
  socket: Socket,
  useCases: {
    createComment: CreateCommentUseCase;
    replyComment: ReplyCommentUseCase;
    resolveComment: ResolveCommentUseCase;
    deleteComment: DeleteCommentUseCase;
  },
) {
  socket.on(
    "comment-create",
    async ({ roomId, elementId, body, sceneId }: { roomId: string; elementId: string; body: string; sceneId?: string }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!checkRateLimit(socket, "comment", RATE_LIMIT_MAX_COMMENT)) return;
        const data = socket.data as SocketData;
        const thread = await useCases.createComment.execute(roomId, data.userId, elementId, body, sceneId);
        socket.to(roomId).emit("comment-created", { roomId, thread });
        socket.emit("comment-created", { roomId, thread });
      } catch (error: unknown) {
        logger.error(error, "comment-create failed");
      }
    },
  );

  socket.on(
    "comment-reply",
    async ({ roomId, threadId, body }: { roomId: string; threadId: string; body: string }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!checkRateLimit(socket, "comment", RATE_LIMIT_MAX_COMMENT)) return;
        const data = socket.data as SocketData;
        const reply = await useCases.replyComment.execute(threadId, data.userId, body);
        socket.to(roomId).emit("comment-replied", { roomId, threadId, reply });
        socket.emit("comment-replied", { roomId, threadId, reply });
      } catch (error: unknown) {
        logger.error(error, "comment-reply failed");
      }
    },
  );

  socket.on(
    "comment-resolve",
    async ({ roomId, threadId, resolved }: { roomId: string; threadId: string; resolved: boolean }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!checkRateLimit(socket, "comment", RATE_LIMIT_MAX_COMMENT)) return;
        const data = socket.data as SocketData;
        const thread = await useCases.resolveComment.execute(threadId, data.userId, resolved);
        socket.to(roomId).emit("comment-resolved", { roomId, thread });
        socket.emit("comment-resolved", { roomId, thread });
      } catch (error: unknown) {
        logger.error(error, "comment-resolve failed");
      }
    },
  );

  socket.on(
    "comment-delete",
    async ({ roomId, threadId }: { roomId: string; threadId: string }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!checkRateLimit(socket, "comment", RATE_LIMIT_MAX_COMMENT)) return;
        const data = socket.data as SocketData;
        await useCases.deleteComment.execute(threadId, data.userId);
        socket.to(roomId).emit("comment-deleted", { roomId, threadId });
        socket.emit("comment-deleted", { roomId, threadId });
      } catch (error: unknown) {
        logger.error(error, "comment-delete failed");
      }
    },
  );
}
