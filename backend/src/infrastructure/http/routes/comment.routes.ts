import { Router } from "express";
import { z } from "zod";
import type { ListCommentsUseCase } from "../../../application/use-cases/comments/list-comments";
import type { CreateCommentUseCase } from "../../../application/use-cases/comments/create-comment";
import type { ReplyCommentUseCase } from "../../../application/use-cases/comments/reply-comment";
import type { ResolveCommentUseCase } from "../../../application/use-cases/comments/resolve-comment";
import type { DeleteCommentUseCase } from "../../../application/use-cases/comments/delete-comment";
import { asyncRoute } from "../middleware/async-handler";
import type { CommentThread, CommentReply } from "../../../domain/entities/comment";

const createSchema = z.object({
  elementId: z.string().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

const replySchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

const resolveSchema = z.object({
  resolved: z.boolean(),
});

function formatReply(r: CommentReply) {
  return {
    id: r.id,
    threadId: r.threadId,
    authorId: r.authorId,
    authorName: r.authorName,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  };
}

function formatThread(t: CommentThread) {
  return {
    id: t.id,
    diagramId: t.diagramId,
    elementId: t.elementId,
    authorId: t.authorId,
    authorName: t.authorName,
    body: t.body,
    resolved: t.resolved,
    resolvedBy: t.resolvedBy,
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    replies: t.replies.map(formatReply),
  };
}

export function createCommentRoutes(
  useCases: {
    list: ListCommentsUseCase;
    create: CreateCommentUseCase;
    reply: ReplyCommentUseCase;
    resolve: ResolveCommentUseCase;
    delete: DeleteCommentUseCase;
  },
  requireAuth: ReturnType<typeof import("../middleware/require-auth").createRequireAuth>,
) {
  const router = Router({ mergeParams: true });
  router.use(requireAuth);

  // GET /api/diagrams/:diagramId/comments
  router.get("/", asyncRoute(async (req, res) => {
    const threads = await useCases.list.execute(String(req.params.diagramId), req.authUser.id);
    return res.json({ threads: threads.map(formatThread) });
  }));

  // POST /api/diagrams/:diagramId/comments
  router.post("/", asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const thread = await useCases.create.execute(
      String(req.params.diagramId),
      req.authUser.id,
      parsed.data.elementId,
      parsed.data.body,
    );
    return res.status(201).json({ thread: formatThread(thread) });
  }));

  // POST /api/diagrams/:diagramId/comments/:threadId/replies
  router.post("/:threadId/replies", asyncRoute(async (req, res) => {
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const reply = await useCases.reply.execute(
      String(req.params.threadId),
      req.authUser.id,
      parsed.data.body,
    );
    return res.status(201).json({ reply: formatReply(reply) });
  }));

  // PATCH /api/diagrams/:diagramId/comments/:threadId/resolve
  router.patch("/:threadId/resolve", asyncRoute(async (req, res) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });
    const thread = await useCases.resolve.execute(
      String(req.params.threadId),
      req.authUser.id,
      parsed.data.resolved,
    );
    return res.json({ thread: formatThread(thread) });
  }));

  // DELETE /api/diagrams/:diagramId/comments/:threadId
  router.delete("/:threadId", asyncRoute(async (req, res) => {
    await useCases.delete.execute(String(req.params.threadId), req.authUser.id);
    return res.json({ success: true });
  }));

  return router;
}
