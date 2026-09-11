import type { Server, Socket } from "socket.io";
import { z } from "zod";
import type { CreateCommentUseCase } from "../../../application/use-cases/comments/create-comment";
import type { ReplyCommentUseCase } from "../../../application/use-cases/comments/reply-comment";
import type { ResolveCommentUseCase } from "../../../application/use-cases/comments/resolve-comment";
import type { DeleteCommentUseCase } from "../../../application/use-cases/comments/delete-comment";
import type { SocketData } from "../helpers";
import { checkRateLimit, onEvent } from "../helpers";
import { logger } from "../../logger";

const RATE_LIMIT_MAX_COMMENT = 10;

const commentBody = z.string().trim().min(1).max(5000);

const commentCreateSchema = z.object({
  roomId: z.string(),
  elementId: z.string().min(1).max(200),
  body: commentBody,
  sceneId: z.uuid().nullish(),
});

const commentReplySchema = z.object({ roomId: z.string(), threadId: z.uuid(), body: commentBody });

const commentResolveSchema = z.object({
  roomId: z.string(),
  threadId: z.uuid(),
  resolved: z.boolean(),
});

const commentDeleteSchema = z.object({ roomId: z.string(), threadId: z.uuid() });

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
  // Comment events gate on room membership only, not canEdit: viewers may comment by design (use cases call requireAccess, not requireEditAccess).
  onEvent(
    socket,
    "comment-create",
    commentCreateSchema,
    async ({ roomId, elementId, body, sceneId }) => {
      try {
        if (!socket.rooms.has(roomId)) return;
        if (!checkRateLimit(socket, "comment", RATE_LIMIT_MAX_COMMENT)) return;
        const data = socket.data as SocketData;
        const thread = await useCases.createComment.execute(
          roomId,
          data.userId,
          elementId,
          body,
          sceneId,
        );
        socket.to(roomId).emit("comment-created", { roomId, thread });
        socket.emit("comment-created", { roomId, thread });
      } catch (error: unknown) {
        logger.error(error, "comment-create failed");
      }
    },
  );

  onEvent(socket, "comment-reply", commentReplySchema, async ({ roomId, threadId, body }) => {
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
  });

  onEvent(
    socket,
    "comment-resolve",
    commentResolveSchema,
    async ({ roomId, threadId, resolved }) => {
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

  onEvent(socket, "comment-delete", commentDeleteSchema, async ({ roomId, threadId }) => {
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
  });
}
