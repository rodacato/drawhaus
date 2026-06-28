import { describe, test, expect } from "vitest";
import { filterBuiltIn, filterByCategory, emptyCategoryMessage } from "../components/TemplatePicker";
import { computeLinkBadge } from "../components/ShareModal";
import { syncLabel } from "../components/DriveSyncBadge";
import { connectionLabel } from "../components/ConnectionBadge";
import { timeAgo } from "../components/OfflineRecoveryDialog";
import type { BuiltInTemplate } from "../data/templates";
import type { TemplateDTO } from "../api/templates";

const builtIns = [
  { category: "flowchart" },
  { category: "uml" },
] as unknown as BuiltInTemplate[];

const dtos = [
  { category: "custom" },
  { category: "uml" },
] as unknown as TemplateDTO[];

describe("TemplatePicker.filterBuiltIn", () => {
  test("returns all for 'all'", () => {
    expect(filterBuiltIn(builtIns, "all")).toHaveLength(2);
  });
  test("returns empty for custom/workspace tabs", () => {
    expect(filterBuiltIn(builtIns, "custom")).toEqual([]);
    expect(filterBuiltIn(builtIns, "workspace")).toEqual([]);
  });
  test("filters by category", () => {
    expect(filterBuiltIn(builtIns, "uml")).toEqual([{ category: "uml" }]);
  });
});

describe("TemplatePicker.filterByCategory", () => {
  test("returns all for 'all' or its own category", () => {
    expect(filterByCategory(dtos, "all", "custom")).toHaveLength(2);
    expect(filterByCategory(dtos, "custom", "custom")).toHaveLength(2);
  });
  test("returns empty when the active tab is the other own-category", () => {
    expect(filterByCategory(dtos, "workspace", "custom")).toEqual([]);
  });
  test("filters by category otherwise", () => {
    expect(filterByCategory(dtos, "uml", "custom")).toEqual([{ category: "uml" }]);
  });
});

describe("TemplatePicker.emptyCategoryMessage", () => {
  test("custom, workspace and default messages", () => {
    expect(emptyCategoryMessage("custom")).toMatch(/personal templates/i);
    expect(emptyCategoryMessage("workspace")).toMatch(/workspace templates/i);
    expect(emptyCategoryMessage("flowchart")).toMatch(/no templates in this category/i);
  });
});

describe("ShareModal.computeLinkBadge", () => {
  const link = (expiresAt: string | null) => ({ token: "t", diagramId: "d", role: "viewer", expiresAt, createdAt: "2026-01-01" });

  test("Active when there is no expiry", () => {
    expect(computeLinkBadge(link(null)).badgeText).toBe("Active");
  });
  test("Expired when the expiry is in the past", () => {
    expect(computeLinkBadge(link("2000-01-01T00:00:00Z")).badgeText).toBe("Expired");
  });
  test("Expires <date> when the expiry is in the future", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeLinkBadge(link(future)).badgeText).toMatch(/^Expires /);
  });
});

describe("DriveSyncBadge.syncLabel", () => {
  test("maps each state", () => {
    expect(syncLabel("synced")).toBe("Drive synced");
    expect(syncLabel("syncing")).toBe("Syncing to Drive...");
    expect(syncLabel("error", "boom")).toBe("boom");
    expect(syncLabel("error", null)).toBe("Drive sync failed");
  });
});

describe("ConnectionBadge.connectionLabel", () => {
  test("maps each state", () => {
    expect(connectionLabel("error", "down")).toBe("down");
    expect(connectionLabel("error", null)).toBe("Connection error");
    expect(connectionLabel("disconnected", null)).toBe("Reconnecting...");
    expect(connectionLabel("connecting", null)).toBe("Connecting...");
  });
});

describe("OfflineRecoveryDialog.timeAgo", () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  test("buckets by elapsed time", () => {
    expect(timeAgo(ago(0))).toBe("just now");
    expect(timeAgo(ago(5 * 60_000))).toBe("5m ago");
    expect(timeAgo(ago(3 * 60 * 60_000))).toBe("3h ago");
    expect(timeAgo(ago(2 * 24 * 60 * 60_000))).toBe("2d ago");
  });
});
