import { describe, test, expect } from "vitest";
import type { ReactNode } from "react";
import { renderHook, act, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/Toast";
import {
  useCollaborationFeedback,
  type CollaborationView,
} from "../lib/hooks/useCollaborationFeedback";

const ana = { userId: "user-ana", name: "Ana" };

function wrapper({ children }: { readonly children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderFeedback(view: CollaborationView = { presenceUsers: [ana], canEdit: true }) {
  const hook = renderHook(() => ({ feedback: useCollaborationFeedback(), toast: useToast() }), {
    wrapper,
  });
  hook.result.current.feedback.collabRef.current = view;
  return hook;
}

function toastCard(message: string): HTMLElement {
  const card = screen.getByText(message);
  expect(card.textContent).toBe(message);
  return card;
}

function isErrorToast(card: HTMLElement): boolean {
  return card.className.includes("text-error");
}

function feedbackToasts(): HTMLElement[] {
  return screen.queryAllByText(/que editabas|fue reemplazado/);
}

describe("useCollaborationFeedback", () => {
  test("a conflict on one element names the collaborator, as info", () => {
    const { result } = renderFeedback();

    act(() => result.current.feedback.callbacks.onConflict(["a"], "user-ana"));

    expect(isErrorToast(toastCard("Ana modificó un elemento que editabas"))).toBe(false);
  });

  test("a conflict on several elements counts them", () => {
    const { result } = renderFeedback();

    act(() => result.current.feedback.callbacks.onConflict(["a", "b", "c"], "user-ana"));

    toastCard("Ana modificó 3 elementos que editabas");
  });

  test("a collaborator missing from presence is 'Otro usuario'", () => {
    const { result } = renderFeedback();

    act(() => result.current.feedback.callbacks.onConflict(["a"], "user-gone"));

    toastCard("Otro usuario modificó un elemento que editabas");
  });

  test("a remote delete names the collaborator and pluralises, as info", () => {
    const { result } = renderFeedback();

    act(() => {
      result.current.feedback.callbacks.onRemoteDelete(["a"], "user-ana");
      result.current.feedback.callbacks.onRemoteDelete(["a", "b"], "user-gone");
    });

    expect(isErrorToast(toastCard("Ana eliminó un elemento que editabas"))).toBe(false);
    expect(isErrorToast(toastCard("Otro usuario eliminó 2 elementos que editabas"))).toBe(false);
  });

  test("a replace that discarded edits is an error toast, singular and plural", () => {
    const { result } = renderFeedback();

    act(() => {
      result.current.feedback.callbacks.onEditsReplaced(["a"]);
      result.current.feedback.callbacks.onEditsReplaced(["a", "b"]);
    });

    const one = toastCard("El diagrama fue reemplazado; se descartaron tus cambios en un elemento");
    const two = toastCard("El diagrama fue reemplazado; se descartaron tus cambios en 2 elementos");
    expect(isErrorToast(one)).toBe(true);
    expect(isErrorToast(two)).toBe(true);
  });

  test("names come from presence as it is when the event lands, not when the hook mounted", () => {
    const { result } = renderFeedback({ presenceUsers: [], canEdit: true });
    result.current.feedback.collabRef.current = { presenceUsers: [ana], canEdit: true };

    act(() => result.current.feedback.callbacks.onConflict(["a"], "user-ana"));

    toastCard("Ana modificó un elemento que editabas");
  });

  test("a read-only user hears none of the three", () => {
    const { result } = renderFeedback({ presenceUsers: [ana], canEdit: false });

    act(() => {
      result.current.feedback.callbacks.onConflict(["a"], "user-ana");
      result.current.feedback.callbacks.onRemoteDelete(["a"], "user-ana");
      result.current.feedback.callbacks.onEditsReplaced(["a"]);
    });
    expect(feedbackToasts()).toHaveLength(0);

    act(() => result.current.toast("control", "info"));
    expect(screen.queryAllByText("control")).toHaveLength(1);
  });

  test("the callbacks keep their identity across re-renders, toasts included", () => {
    const { result, rerender } = renderFeedback();
    const first = result.current.feedback.callbacks;

    act(() => first.onConflict(["a"], "user-ana"));
    rerender();

    const next = result.current.feedback.callbacks;
    expect(next.onConflict).toBe(first.onConflict);
    expect(next.onRemoteDelete).toBe(first.onRemoteDelete);
    expect(next.onEditsReplaced).toBe(first.onEditsReplaced);
  });
});
