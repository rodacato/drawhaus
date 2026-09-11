import { Router } from "express";
import { z } from "zod";
import type { ListCommentsUseCase } from "../../../application/use-cases/comments/list-comments";
import type { CreateCommentUseCase } from "../../../application/use-cases/comments/create-comment";
import type { ReplyCommentUseCase } from "../../../application/use-cases/comments/reply-comment";
import type { ResolveCommentUseCase } from "../../../application/use-cases/comments/resolve-comment";
import type { DeleteCommentUseCase } from "../../../application/use-cases/comments/delete-comment";
import type { ToggleLikeUseCase } from "../../../application/use-cases/comments/toggle-like";
import { asyncRoute } from "../middleware/async-handler";
import { validate, validateParams } from "../middleware/validate";
import type { RealtimeNotifier } from "../../../domain/ports/realtime-notifier";
import { formatReply, formatThread } from "../../serializers/comment";

const diagramIdParams = z.object({ diagramId: z.uuid() });
const threadParams = z.object({ diagramId: z.uuid(), threadId: z.uuid() });

const createSchema = z.object({
  elementId: z.string().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  sceneId: z.uuid().optional(),
});

const replySchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

const resolveSchema = z.object({
  resolved: z.boolean(),
});

export function createCommentRoutes(
  useCases: {
    list: ListCommentsUseCase;
    create: CreateCommentUseCase;
    reply: ReplyCommentUseCase;
    resolve: ResolveCommentUseCase;
    delete: DeleteCommentUseCase;
    toggleLike: ToggleLikeUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
  notifier?: RealtimeNotifier,
) {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);

  // GET /api/diagrams/:diagramId/comments?sceneId=xxx
  router.get(
    "/",
    validateParams(diagramIdParams),
    asyncRoute(async (req, res) => {
      const sceneId = typeof req.query.sceneId === "string" ? req.query.sceneId : undefined;
      const threads = await useCases.list.execute(
        String(req.params.diagramId),
        req.authUser.id,
        sceneId,
      );
      return res.json({ threads: threads.map(formatThread) });
    }),
  );

  // POST /api/diagrams/:diagramId/comments
  router.post(
    "/",
    validateParams(diagramIdParams),
    validate(createSchema),
    asyncRoute(async (req, res) => {
      const diagramId = String(req.params.diagramId);
      const thread = await useCases.create.execute(
        diagramId,
        req.authUser.id,
        req.body.elementId,
        req.body.body,
        req.body.sceneId,
      );
      notifier?.commentChanged({ kind: "created", diagramId, thread });
      return res.status(201).json({ thread: formatThread(thread) });
    }),
  );

  // POST /api/diagrams/:diagramId/comments/:threadId/replies
  router.post(
    "/:threadId/replies",
    validateParams(threadParams),
    validate(replySchema),
    asyncRoute(async (req, res) => {
      const threadId = String(req.params.threadId);
      const reply = await useCases.reply.execute(threadId, req.authUser.id, req.body.body);
      notifier?.commentChanged({
        kind: "replied",
        diagramId: String(req.params.diagramId),
        threadId,
        reply,
      });
      return res.status(201).json({ reply: formatReply(reply) });
    }),
  );

  // PATCH /api/diagrams/:diagramId/comments/:threadId/resolve
  router.patch(
    "/:threadId/resolve",
    validateParams(threadParams),
    validate(resolveSchema),
    asyncRoute(async (req, res) => {
      const thread = await useCases.resolve.execute(
        String(req.params.threadId),
        req.authUser.id,
        req.body.resolved,
      );
      notifier?.commentChanged({
        kind: "resolved",
        diagramId: String(req.params.diagramId),
        thread,
      });
      return res.json({ thread: formatThread(thread) });
    }),
  );

  // DELETE /api/diagrams/:diagramId/comments/:threadId
  router.delete(
    "/:threadId",
    validateParams(threadParams),
    asyncRoute(async (req, res) => {
      const threadId = String(req.params.threadId);
      await useCases.delete.execute(threadId, req.authUser.id);
      notifier?.commentChanged({
        kind: "deleted",
        diagramId: String(req.params.diagramId),
        threadId,
      });
      return res.json({ success: true });
    }),
  );

  // POST /api/diagrams/:diagramId/comments/:threadId/like
  router.post(
    "/:threadId/like",
    validateParams(threadParams),
    asyncRoute(async (req, res) => {
      const result = await useCases.toggleLike.execute(
        String(req.params.threadId),
        req.authUser.id,
      );
      return res.json(result);
    }),
  );

  return router;
}
