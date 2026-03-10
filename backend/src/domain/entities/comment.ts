export type CommentThread = {
  id: string;
  diagramId: string;
  sceneId: string | null;
  elementId: string;
  authorId: string;
  authorName: string;
  body: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  replies: CommentReply[];
};

export type CommentReply = {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
};
