import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useComments } from "../lib/hooks/useComments";
import { commentsApi } from "../api/comments";
import { createMockSocket, makeRef, triggerSocketEvent, type MockSocket } from "./_helpers/mock-socket";
import type { Socket } from "socket.io-client";
import type { CommentThread, CommentReply } from "../lib/types";

function makeThread(over: Partial<CommentThread> = {}): CommentThread {
  return {
    id: "th1",
    diagramId: "d1",
    sceneId: null,
    elementId: "el1",
    authorId: "u1",
    authorName: "Ana",
    body: "hi",
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    replies: [],
    likeCount: 0,
    likedByMe: false,
    ...over,
  };
}

function makeReply(over: Partial<CommentReply> = {}): CommentReply {
  return {
    id: "r1",
    threadId: "th1",
    authorId: "u1",
    authorName: "Ana",
    body: "reply",
    createdAt: "2026-01-01",
    ...over,
  };
}

function render(opts: { socket?: MockSocket | null; diagramId?: string; sceneId?: string | null } = {}) {
  const socketRef = makeRef((opts.socket ?? null) as unknown as Socket | null);
  const view = renderHook(() =>
    useComments({ diagramId: opts.diagramId ?? "d1", sceneId: opts.sceneId ?? null, socketRef }),
  );
  return { ...view, socketRef };
}

async function renderLoaded(opts: { socket?: MockSocket | null; diagramId?: string; sceneId?: string | null; seed?: CommentThread[] } = {}) {
  vi.spyOn(commentsApi, "list").mockResolvedValue({ threads: opts.seed ?? [] } as never);
  const view = render(opts);
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe("useComments", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("loads threads on mount with the current diagram and scene", async () => {
    const listSpy = vi.spyOn(commentsApi, "list").mockResolvedValue({ threads: [makeThread()] } as never);
    const { result } = render({ sceneId: "s1" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listSpy).toHaveBeenCalledWith("d1", "s1");
    expect(result.current.threads).toHaveLength(1);
  });

  test("refresh is silent on API error and still clears loading", async () => {
    vi.spyOn(commentsApi, "list").mockRejectedValue(new Error("boom"));
    const { result } = render();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.threads).toEqual([]);
  });

  test("defaults to an empty list when the response omits threads", async () => {
    vi.spyOn(commentsApi, "list").mockResolvedValue({} as never);
    const { result } = render();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.threads).toEqual([]);
  });

  test("socket comment-created adds a thread for the current diagram", async () => {
    const socket = createMockSocket();
    const { result } = await renderLoaded({ socket });

    act(() => triggerSocketEvent(socket, "comment-created", { roomId: "d1", thread: makeThread({ id: "new" }) }));
    expect(result.current.threads.map((t) => t.id)).toEqual(["new"]);
  });

  test("socket comment-created ignores threads from another diagram", async () => {
    const socket = createMockSocket();
    const { result } = await renderLoaded({ socket });

    act(() => triggerSocketEvent(socket, "comment-created", { roomId: "x", thread: makeThread({ id: "new", diagramId: "other" }) }));
    expect(result.current.threads).toEqual([]);
  });

  test("socket comment-created filters threads from a different scene but keeps general ones", async () => {
    const socket = createMockSocket();
    const { result } = await renderLoaded({ socket, sceneId: "s1" });

    act(() => triggerSocketEvent(socket, "comment-created", { roomId: "d1", thread: makeThread({ id: "other-scene", sceneId: "s2" }) }));
    expect(result.current.threads).toEqual([]);

    act(() => triggerSocketEvent(socket, "comment-created", { roomId: "d1", thread: makeThread({ id: "same-scene", sceneId: "s1" }) }));
    act(() => triggerSocketEvent(socket, "comment-created", { roomId: "d1", thread: makeThread({ id: "general", sceneId: null }) }));
    expect(result.current.threads.map((t) => t.id)).toEqual(["same-scene", "general"]);
  });

  test("socket comment-created dedups threads by id", async () => {
    const socket = createMockSocket();
    const { result } = await renderLoaded({ socket });

    act(() => triggerSocketEvent(socket, "comment-created", { roomId: "d1", thread: makeThread({ id: "dup" }) }));
    act(() => triggerSocketEvent(socket, "comment-created", { roomId: "d1", thread: makeThread({ id: "dup" }) }));
    expect(result.current.threads).toHaveLength(1);
  });

  test("socket comment-replied appends a reply and dedups by reply id", async () => {
    const socket = createMockSocket();
    const { result } = await renderLoaded({ socket, seed: [makeThread({ id: "th1" })] });

    act(() => triggerSocketEvent(socket, "comment-replied", { roomId: "d1", threadId: "th1", reply: makeReply({ id: "r1" }) }));
    act(() => triggerSocketEvent(socket, "comment-replied", { roomId: "d1", threadId: "th1", reply: makeReply({ id: "r1" }) }));
    expect(result.current.threads[0].replies.map((r) => r.id)).toEqual(["r1"]);
  });

  test("socket comment-resolved patches the resolution fields", async () => {
    const socket = createMockSocket();
    const { result } = await renderLoaded({ socket, seed: [makeThread({ id: "th1" })] });

    act(() => triggerSocketEvent(socket, "comment-resolved", {
      roomId: "d1",
      thread: makeThread({ id: "th1", resolved: true, resolvedBy: "u2", resolvedAt: "2026-02-02" }),
    }));
    expect(result.current.threads[0]).toMatchObject({ resolved: true, resolvedBy: "u2", resolvedAt: "2026-02-02" });
  });

  test("socket comment-deleted removes the thread", async () => {
    const socket = createMockSocket();
    const { result } = await renderLoaded({ socket, seed: [makeThread({ id: "th1" }), makeThread({ id: "th2" })] });

    act(() => triggerSocketEvent(socket, "comment-deleted", { roomId: "d1", threadId: "th1" }));
    expect(result.current.threads.map((t) => t.id)).toEqual(["th2"]);
  });

  test("createThread emits over the socket and skips the REST call when connected", async () => {
    const socket = createMockSocket();
    const createSpy = vi.spyOn(commentsApi, "create");
    const { result } = await renderLoaded({ socket, sceneId: "s1" });

    await act(async () => { await result.current.createThread("el9", "hello"); });
    expect(socket.emit).toHaveBeenCalledWith("comment-create", { roomId: "d1", elementId: "el9", body: "hello", sceneId: "s1" });
    expect(createSpy).not.toHaveBeenCalled();
  });

  test("createThread falls back to REST and appends the thread when no socket", async () => {
    const createSpy = vi.spyOn(commentsApi, "create").mockResolvedValue({ thread: makeThread({ id: "rest" }) } as never);
    const { result } = await renderLoaded({ socket: null });

    await act(async () => { await result.current.createThread("el1", "hi"); });
    expect(createSpy).toHaveBeenCalledWith("d1", { elementId: "el1", body: "hi", sceneId: null });
    expect(result.current.threads.map((t) => t.id)).toContain("rest");
  });

  test("addReply falls back to REST and appends the reply when no socket", async () => {
    vi.spyOn(commentsApi, "list").mockResolvedValue({ threads: [makeThread({ id: "th1" })] } as never);
    const replySpy = vi.spyOn(commentsApi, "reply").mockResolvedValue({ reply: makeReply({ id: "r9" }) } as never);
    const { result } = render({ socket: null });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.addReply("th1", "yo"); });
    expect(replySpy).toHaveBeenCalledWith("d1", "th1", { body: "yo" });
    expect(result.current.threads[0].replies.map((r) => r.id)).toEqual(["r9"]);
  });

  test("resolveThread falls back to REST and patches resolved state when no socket", async () => {
    vi.spyOn(commentsApi, "list").mockResolvedValue({ threads: [makeThread({ id: "th1" })] } as never);
    const resolveSpy = vi.spyOn(commentsApi, "resolve").mockResolvedValue({} as never);
    const { result } = render({ socket: null });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.resolveThread("th1", true); });
    expect(resolveSpy).toHaveBeenCalledWith("d1", "th1", true);
    expect(result.current.threads[0].resolved).toBe(true);
  });

  test("deleteThread falls back to REST and removes the thread when no socket", async () => {
    vi.spyOn(commentsApi, "list").mockResolvedValue({ threads: [makeThread({ id: "th1" })] } as never);
    const deleteSpy = vi.spyOn(commentsApi, "delete").mockResolvedValue({} as never);
    const { result } = render({ socket: null });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.deleteThread("th1"); });
    expect(deleteSpy).toHaveBeenCalledWith("d1", "th1");
    expect(result.current.threads).toEqual([]);
  });

  test("toggleLike always calls REST and patches the like state", async () => {
    vi.spyOn(commentsApi, "list").mockResolvedValue({ threads: [makeThread({ id: "th1", likeCount: 0, likedByMe: false })] } as never);
    const likeSpy = vi.spyOn(commentsApi, "toggleLike").mockResolvedValue({ liked: true, likeCount: 3 } as never);
    const socket = createMockSocket();
    const { result } = render({ socket });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.toggleLike("th1"); });
    expect(likeSpy).toHaveBeenCalledWith("d1", "th1");
    expect(result.current.threads[0]).toMatchObject({ likeCount: 3, likedByMe: true });
  });

  test("elementsWithComments counts only unresolved threads per element", async () => {
    const { result } = await renderLoaded({
      seed: [
        makeThread({ id: "a", elementId: "el1" }),
        makeThread({ id: "b", elementId: "el1" }),
        makeThread({ id: "c", elementId: "el2", resolved: true }),
      ],
    });

    expect(result.current.elementsWithComments.get("el1")).toBe(2);
    expect(result.current.elementsWithComments.has("el2")).toBe(false);
  });
});
