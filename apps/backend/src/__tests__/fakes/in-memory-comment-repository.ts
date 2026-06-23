import crypto from "crypto";
import type { CommentRepository } from "../../domain/ports/comment-repository";
import type { CommentThread, CommentReply } from "../../domain/entities/comment";
import type { User } from "../../domain/entities/user";

type ThreadRecord = {
  id: string;
  diagramId: string;
  sceneId: string | null;
  elementId: string;
  authorId: string;
  body: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ReplyRecord = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: Date;
};

export class InMemoryCommentRepository implements CommentRepository {
  threads: ThreadRecord[] = [];
  replies: ReplyRecord[] = [];
  likes: { threadId: string; userId: string }[] = [];
  private users: () => User[];

  constructor(usersGetter: () => User[]) {
    this.users = usersGetter;
  }

  private authorName(userId: string): string {
    return this.users().find((u) => u.id === userId)?.name ?? "";
  }

  private repliesFor(threadId: string): CommentReply[] {
    return this.replies
      .filter((r) => r.threadId === threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((r) => ({
        id: r.id,
        threadId: r.threadId,
        authorId: r.authorId,
        authorName: this.authorName(r.authorId),
        body: r.body,
        createdAt: r.createdAt,
      }));
  }

  private toDomain(t: ThreadRecord, currentUserId?: string): CommentThread {
    const threadLikes = this.likes.filter((l) => l.threadId === t.id);
    return {
      id: t.id,
      diagramId: t.diagramId,
      sceneId: t.sceneId,
      elementId: t.elementId,
      authorId: t.authorId,
      authorName: this.authorName(t.authorId),
      body: t.body,
      resolved: t.resolved,
      resolvedBy: t.resolvedBy,
      resolvedAt: t.resolvedAt,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      replies: this.repliesFor(t.id),
      likeCount: threadLikes.length,
      likedByMe: currentUserId ? threadLikes.some((l) => l.userId === currentUserId) : false,
    };
  }

  async findByDiagram(diagramId: string, sceneId?: string | null, currentUserId?: string): Promise<CommentThread[]> {
    const matching = this.threads.filter((t) => {
      if (t.diagramId !== diagramId) return false;
      if (sceneId) return t.sceneId === sceneId || t.sceneId === null;
      return true;
    });
    matching.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return matching.map((t) => this.toDomain(t, currentUserId));
  }

  async findThreadById(id: string, currentUserId?: string): Promise<CommentThread | null> {
    const t = this.threads.find((x) => x.id === id);
    return t ? this.toDomain(t, currentUserId) : null;
  }

  async createThread(data: { diagramId: string; sceneId?: string | null; elementId: string; authorId: string; body: string }): Promise<CommentThread> {
    const now = new Date();
    const record: ThreadRecord = {
      id: crypto.randomUUID(),
      diagramId: data.diagramId,
      sceneId: data.sceneId ?? null,
      elementId: data.elementId,
      authorId: data.authorId,
      body: data.body,
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.threads.push(record);
    return this.toDomain(record, data.authorId);
  }

  async addReply(data: { threadId: string; authorId: string; body: string }): Promise<CommentReply> {
    const thread = this.threads.find((t) => t.id === data.threadId);
    if (!thread) throw new Error("Thread not found");
    const reply: ReplyRecord = {
      id: crypto.randomUUID(),
      threadId: data.threadId,
      authorId: data.authorId,
      body: data.body,
      createdAt: new Date(),
    };
    this.replies.push(reply);
    thread.updatedAt = new Date();
    return {
      id: reply.id,
      threadId: reply.threadId,
      authorId: reply.authorId,
      authorName: this.authorName(reply.authorId),
      body: reply.body,
      createdAt: reply.createdAt,
    };
  }

  async resolveThread(id: string, userId: string): Promise<CommentThread | null> {
    const thread = this.threads.find((t) => t.id === id);
    if (!thread) return null;
    const now = new Date();
    thread.resolved = true;
    thread.resolvedBy = userId;
    thread.resolvedAt = now;
    thread.updatedAt = now;
    return this.toDomain(thread, userId);
  }

  async unresolveThread(id: string): Promise<CommentThread | null> {
    const thread = this.threads.find((t) => t.id === id);
    if (!thread) return null;
    thread.resolved = false;
    thread.resolvedBy = null;
    thread.resolvedAt = null;
    thread.updatedAt = new Date();
    return this.toDomain(thread);
  }

  async deleteThread(id: string): Promise<void> {
    this.threads = this.threads.filter((t) => t.id !== id);
    this.replies = this.replies.filter((r) => r.threadId !== id);
    this.likes = this.likes.filter((l) => l.threadId !== id);
  }

  async deleteReply(id: string): Promise<void> {
    this.replies = this.replies.filter((r) => r.id !== id);
  }

  async toggleLike(threadId: string, userId: string): Promise<boolean> {
    const existing = this.likes.findIndex((l) => l.threadId === threadId && l.userId === userId);
    if (existing >= 0) {
      this.likes.splice(existing, 1);
      return false;
    }
    this.likes.push({ threadId, userId });
    return true;
  }
}
