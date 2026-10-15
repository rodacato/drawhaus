import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/api/share", () => ({
  shareApi: { list: vi.fn(), create: vi.fn(), deleteLink: vi.fn() },
}));

const toast = vi.fn();
vi.mock("@/components/Toast", () => ({ useToast: () => toast }));

import { shareApi } from "@/api/share";
import { ShareModal } from "@/components/ShareModal";

function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

beforeEach(() => {
  toast.mockReset();
  vi.mocked(shareApi.list).mockReset().mockResolvedValue({ links: [] });
  vi.mocked(shareApi.create)
    .mockReset()
    .mockResolvedValue({ shareLink: { token: "tok-1" } });
});

describe("ShareModal", () => {
  test("a clipboard failure after the link was created is not reported as a creation failure", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    render(<ShareModal open onClose={() => {}} diagramId="d1" />);

    await userEvent.click(await screen.findByRole("button", { name: /copy link/i }));

    await vi.waitFor(() => expect(toast).toHaveBeenCalled());
    expect(shareApi.create).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls.map(([message]) => message)).toEqual([
      "Link created, but it could not be copied. Copy it from the list.",
    ]);
    expect(shareApi.list).toHaveBeenCalledTimes(2);
  });

  test("a failed creation still reports that the link could not be created", async () => {
    stubClipboard(() => Promise.resolve());
    vi.mocked(shareApi.create).mockRejectedValue(new Error("boom"));
    render(<ShareModal open onClose={() => {}} diagramId="d1" />);

    await userEvent.click(await screen.findByRole("button", { name: /copy link/i }));

    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Could not create the share link", "error"),
    );
  });
});
