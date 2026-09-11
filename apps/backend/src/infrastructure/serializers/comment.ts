import type { CommentReply, CommentThread } from "../../domain/entities/comment";

export function formatReply(r: CommentReply) {
  return {
    id: r.id,
    threadId: r.threadId,
    authorId: r.authorId,
    authorName: r.authorName,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  };
}

export function formatThread(t: CommentThread) {
  return {
    id: t.id,
    diagramId: t.diagramId,
    sceneId: t.sceneId,
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
    likeCount: t.likeCount,
    likedByMe: t.likedByMe,
  };
}
