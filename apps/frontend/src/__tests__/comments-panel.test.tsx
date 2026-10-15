import { describe, test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentsPanel } from "../components/CommentsPanel";
import { ConfirmProvider } from "../components/ConfirmDialog";
import { ToastProvider } from "../components/Toast";
import type { CommentThread } from "../lib/types";

function makeThread(over: Partial<CommentThread> = {}): CommentThread {
  return {
    id: "th1",
    diagramId: "d1",
    sceneId: null,
    elementId: "__general__",
    authorId: "u1",
    authorName: "Ana",
    body: "Looks good",
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replies: [],
    likeCount: 0,
    likedByMe: false,
    ...over,
  };
}

function setup(over: Partial<Parameters<typeof CommentsPanel>[0]> = {}) {
  const props = {
    threads: [makeThread()],
    loadError: false,
    onRetry: vi.fn(),
    elements: [],
    selectedElementId: null,
    showIndicators: true,
    onToggleIndicators: vi.fn(),
    onCreateThread: vi.fn().mockResolvedValue(undefined),
    onReply: vi.fn().mockResolvedValue(undefined),
    onResolve: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onToggleLike: vi.fn().mockResolvedValue(undefined),
    onHighlightElement: vi.fn(),
    onClose: vi.fn(),
    ...over,
  };
  render(
    <ToastProvider>
      <ConfirmProvider>
        <CommentsPanel {...props} />
      </ConfirmProvider>
    </ToastProvider>,
  );
  return props;
}

describe("CommentsPanel", () => {
  test("a failed load shows an error with a retry instead of the empty message", async () => {
    const props = setup({ threads: [], loadError: true });

    expect(screen.getByRole("alert").textContent).toContain("Could not load the comments.");
    expect(screen.queryByText("No open comments")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  test("deleting asks first, names the replies and only then deletes", async () => {
    const reply = {
      id: "r1",
      threadId: "th1",
      authorId: "u2",
      authorName: "Bo",
      body: "agreed",
      createdAt: new Date().toISOString(),
    };
    const props = setup({ threads: [makeThread({ replies: [reply] })] });

    await userEvent.click(screen.getByRole("button", { name: "Delete comment" }));
    expect(screen.getByText(/this comment and its 1 reply/)).toBeTruthy();
    expect(props.onDelete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith("th1"));
  });

  test("cancelling the confirmation keeps the thread", async () => {
    const props = setup();

    await userEvent.click(screen.getByRole("button", { name: "Delete comment" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.onDelete).not.toHaveBeenCalled();
  });

  test("a failed post keeps the typed text and says so", async () => {
    const props = setup({ onCreateThread: vi.fn().mockRejectedValue(new Error("nope")) });

    await userEvent.type(screen.getByLabelText("New comment"), "hello");
    await userEvent.click(screen.getByRole("button", { name: "Post" }));

    expect(await screen.findByText("Could not post the comment.")).toBeTruthy();
    expect((screen.getByLabelText("New comment") as HTMLTextAreaElement).value).toBe("hello");
    expect(props.onCreateThread).toHaveBeenCalledWith("__general__", "hello");
  });

  test("the filter tabs expose tab semantics and the controls that did nothing are gone", async () => {
    setup();

    expect(screen.getByRole("tab", { name: "Open", selected: true })).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Resolved" }));
    expect(screen.getByRole("tab", { name: "Resolved", selected: true })).toBeTruthy();
    for (const name of ["Filter comments", "Mention someone", "Add emoji", "Attach file"]) {
      expect(screen.queryByTitle(name)).toBeNull();
    }
  });
});
