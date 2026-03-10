import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { commentsApi } from "@/api/comments";
import type { CommentThread, CommentReply } from "@/lib/types";

export type UseCommentsOptions = {
  diagramId: string;
  socketRef: React.MutableRefObject<Socket | null>;
};

export type UseCommentsState = {
  threads: CommentThread[];
  loading: boolean;
  elementsWithComments: Map<string, number>;
  createThread: (elementId: string, body: string) => Promise<void>;
  addReply: (threadId: string, body: string) => Promise<void>;
  resolveThread: (threadId: string, resolved: boolean) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useComments({ diagramId, socketRef }: UseCommentsOptions): UseCommentsState {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const diagramIdRef = useRef(diagramId);
  diagramIdRef.current = diagramId;

  const refresh = useCallback(async () => {
    try {
      const data = await commentsApi.list(diagramIdRef.current);
      setThreads(data.threads ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh, diagramId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function onCreated({ thread }: { roomId: string; thread: CommentThread }) {
      if (thread.diagramId !== diagramIdRef.current) return;
      setThreads((prev) => {
        if (prev.some((t) => t.id === thread.id)) return prev;
        return [...prev, thread];
      });
    }

    function onReplied({ threadId, reply }: { roomId: string; threadId: string; reply: CommentReply }) {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          if (t.replies.some((r) => r.id === reply.id)) return t;
          return { ...t, replies: [...t.replies, reply] };
        }),
      );
    }

    function onResolved({ thread }: { roomId: string; thread: CommentThread }) {
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, resolved: thread.resolved, resolvedBy: thread.resolvedBy, resolvedAt: thread.resolvedAt } : t)),
      );
    }

    function onDeleted({ threadId }: { roomId: string; threadId: string }) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    }

    socket.on("comment-created", onCreated);
    socket.on("comment-replied", onReplied);
    socket.on("comment-resolved", onResolved);
    socket.on("comment-deleted", onDeleted);

    return () => {
      socket.off("comment-created", onCreated);
      socket.off("comment-replied", onReplied);
      socket.off("comment-resolved", onResolved);
      socket.off("comment-deleted", onDeleted);
    };
  }, [socketRef]);

  const createThread = useCallback(async (elementId: string, body: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("comment-create", { roomId: diagramIdRef.current, elementId, body });
    } else {
      const data = await commentsApi.create(diagramIdRef.current, { elementId, body });
      setThreads((prev) => [...prev, data.thread]);
    }
  }, [socketRef]);

  const addReply = useCallback(async (threadId: string, body: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("comment-reply", { roomId: diagramIdRef.current, threadId, body });
    } else {
      const data = await commentsApi.reply(diagramIdRef.current, threadId, { body });
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, replies: [...t.replies, data.reply] } : t)),
      );
    }
  }, [socketRef]);

  const resolveThread = useCallback(async (threadId: string, resolved: boolean) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("comment-resolve", { roomId: diagramIdRef.current, threadId, resolved });
    } else {
      await commentsApi.resolve(diagramIdRef.current, threadId, resolved);
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, resolved } : t)),
      );
    }
  }, [socketRef]);

  const deleteThread = useCallback(async (threadId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("comment-delete", { roomId: diagramIdRef.current, threadId });
    } else {
      await commentsApi.delete(diagramIdRef.current, threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
    }
  }, [socketRef]);

  // Derive elements with comments count
  const elementsWithComments = new Map<string, number>();
  for (const t of threads) {
    if (!t.resolved) {
      elementsWithComments.set(t.elementId, (elementsWithComments.get(t.elementId) ?? 0) + 1);
    }
  }

  return {
    threads,
    loading,
    elementsWithComments,
    createThread,
    addReply,
    resolveThread,
    deleteThread,
    refresh,
  };
}
