import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "../components/Dialog";

function Harness({ onClose, dismissible }: { onClose: () => void; dismissible?: boolean }) {
  return (
    <div>
      <button>Opener</button>
      <Dialog label="Invite User" onClose={onClose} dismissible={dismissible}>
        <input aria-label="Email" />
        <button>Send</button>
      </Dialog>
    </div>
  );
}

describe("Dialog", () => {
  test("is a labelled modal that focuses its first control", () => {
    render(<Harness onClose={() => {}} />);
    const dialog = screen.getByRole("dialog", { name: "Invite User" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
  });

  test("Escape closes it", async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Tab wraps from the last control to the first and back", async () => {
    render(<Harness onClose={() => {}} />);
    const email = screen.getByLabelText("Email");
    const send = screen.getByRole("button", { name: "Send" });
    send.focus();
    await userEvent.tab();
    expect(document.activeElement).toBe(email);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(send);
  });

  test("clicking the backdrop closes it, unless it is not dismissible", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness onClose={onClose} dismissible={false} />);
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    await userEvent.click(backdrop);
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();

    rerender(<Harness onClose={onClose} />);
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("returns focus to the opener when it unmounts", () => {
    function Wrapper({ open }: { open: boolean }) {
      return (
        <div>
          <button>Opener</button>
          {open && (
            <Dialog label="x" onClose={() => {}}>
              <button>Inside</button>
            </Dialog>
          )}
        </div>
      );
    }
    const { rerender } = render(<Wrapper open={false} />);
    screen.getByRole("button", { name: "Opener" }).focus();
    rerender(<Wrapper open />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Inside" }));
    rerender(<Wrapper open={false} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Opener" }));
  });
});
