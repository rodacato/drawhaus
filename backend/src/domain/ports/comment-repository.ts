import type { CommentThread, CommentReply } from "../entities/comment";

export interface CommentRepository {
  findByDiagram(diagramId: string, sceneId?: string | null): Promise<CommentThread[]>;
  findThreadById(id: string): Promise<CommentThread | null>;
  createThread(data: { diagramId: string; sceneId?: string | null; elementId: string; authorId: string; body: string }): Promise<CommentThread>;
  addReply(data: { threadId: string; authorId: string; body: string }): Promise<CommentReply>;
  resolveThread(id: string, userId: string): Promise<CommentThread | null>;
  unresolveThread(id: string): Promise<CommentThread | null>;
  deleteThread(id: string): Promise<void>;
  deleteReply(id: string): Promise<void>;
}
