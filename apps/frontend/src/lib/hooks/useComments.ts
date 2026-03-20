import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { commentsApi } from "@/api/comments";
import { countElementComments } from "@/lib/comments";
import type { CommentThread, CommentReply } from "@/lib/types";

export type UseCommentsOptions = {
  diagramId: string;
  sceneId: string | null;
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
  toggleLike: (threadId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function useComments({ diagramId, sceneId, socketRef }: UseCommentsOptions): UseCommentsState {
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const diagramIdRef = useRef(diagramId);
  diagramIdRef.current = diagramId;
  const sceneIdRef = useRef(sceneId);
  sceneIdRef.current = sceneId;

  const refresh = useCallback(async () => {
    try {
      const data = await commentsApi.list(diagramIdRef.current, sceneIdRef.current);
      setThreads(data.threads ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and when scene changes
  useEffect(() => {
    refresh();
  }, [refresh, diagramId, sceneId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    function onCreated({ thread }: { roomId: string; thread: CommentThread }) {
      if (thread.diagramId !== diagramIdRef.current) return;
      // Only show comments for current scene (or general comments)
      if (thread.sceneId && sceneIdRef.current && thread.sceneId !== sceneIdRef.current) return;
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

  /** Emit via socket if connected, otherwise call the REST fallback. */
  const emitOrFallback = useCallback(
    async (event: string, payload: Record<string, unknown>, fallback: () => Promise<void>) => {
      const socket = socketRef.current;
      if (socket) {
        socket.emit(event, { roomId: diagramIdRef.current, ...payload });
      } else {
        await fallback();
      }
    },
    [socketRef],
  );

  const createThread = useCallback(async (elementId: string, body: string) => {
    const currentSceneId = sceneIdRef.current;
    await emitOrFallback(
      "comment-create",
      { elementId, body, sceneId: currentSceneId },
      async () => {
        const data = await commentsApi.create(diagramIdRef.current, { elementId, body, sceneId: currentSceneId });
        setThreads((prev) => [...prev, data.thread]);
      },
    );
  }, [emitOrFallback]);

  const addReply = useCallback(async (threadId: string, body: string) => {
    await emitOrFallback(
      "comment-reply",
      { threadId, body },
      async () => {
        const data = await commentsApi.reply(diagramIdRef.current, threadId, { body });
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, replies: [...t.replies, data.reply] } : t)),
        );
      },
    );
  }, [emitOrFallback]);

  const resolveThread = useCallback(async (threadId: string, resolved: boolean) => {
    await emitOrFallback(
      "comment-resolve",
      { threadId, resolved },
      async () => {
        await commentsApi.resolve(diagramIdRef.current, threadId, resolved);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, resolved } : t)),
        );
      },
    );
  }, [emitOrFallback]);

  const deleteThread = useCallback(async (threadId: string) => {
    await emitOrFallback(
      "comment-delete",
      { threadId },
      async () => {
        await commentsApi.delete(diagramIdRef.current, threadId);
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
      },
    );
  }, [emitOrFallback]);

  const toggleLike = useCallback(async (threadId: string) => {
    const data = await commentsApi.toggleLike(diagramIdRef.current, threadId);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, likeCount: data.likeCount, likedByMe: data.liked } : t)),
    );
  }, []);

  // Derive elements with comments count
  const elementsWithComments = useMemo(() => countElementComments(threads), [threads]);

  return {
    threads,
    loading,
    elementsWithComments,
    createThread,
    addReply,
    resolveThread,
    deleteThread,
    toggleLike,
    refresh,
  };
}
