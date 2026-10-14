import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/share", () => ({
  shareApi: { list: vi.fn(), create: vi.fn() },
}));

import { shareApi } from "@/api/share";
import { findOrCreateShareUrl } from "../lib/share-links";

const past = new Date(Date.now() - 3_600_000).toISOString();
const future = new Date(Date.now() + 3_600_000).toISOString();

beforeEach(() => {
  vi.mocked(shareApi.list).mockReset();
  vi.mocked(shareApi.create).mockReset();
});

describe("findOrCreateShareUrl", () => {
  test("reuses a live link of the same role", async () => {
    vi.mocked(shareApi.list).mockResolvedValue({
      links: [{ token: "live-viewer", role: "viewer", expiresAt: future }],
    });
    const url = await findOrCreateShareUrl("d1", "viewer");
    expect(url).toBe(`${globalThis.location.origin}/share/live-viewer`);
    expect(shareApi.create).not.toHaveBeenCalled();
  });

  test("does not reuse an expired link or one of another role", async () => {
    vi.mocked(shareApi.list).mockResolvedValue({
      links: [
        { token: "old", role: "viewer", expiresAt: past },
        { token: "other-role", role: "editor", expiresAt: null },
      ],
    });
    vi.mocked(shareApi.create).mockResolvedValue({ shareLink: { token: "fresh" } });
    const url = await findOrCreateShareUrl("d1", "viewer");
    expect(url.endsWith("/share/fresh")).toBe(true);
    expect(shareApi.create).toHaveBeenCalledWith("d1", "viewer");
  });

  test("a link that was revoked on the server is no longer returned", async () => {
    vi.mocked(shareApi.list).mockResolvedValue({ links: [] });
    vi.mocked(shareApi.create).mockResolvedValue({ shareLink: { token: "after-revoke" } });
    const url = await findOrCreateShareUrl("d1", "editor");
    expect(url.endsWith("/share/after-revoke")).toBe(true);
  });

  test("fails loudly when the server returns no token", async () => {
    vi.mocked(shareApi.list).mockResolvedValue({ links: [] });
    vi.mocked(shareApi.create).mockResolvedValue({});
    await expect(findOrCreateShareUrl("d1", "viewer")).rejects.toThrow(/no share token/);
  });
});
