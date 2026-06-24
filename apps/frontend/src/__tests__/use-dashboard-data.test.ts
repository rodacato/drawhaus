import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDashboardData } from "../lib/hooks/useDashboardData";
import { diagramsApi } from "../api/diagrams";
import { foldersApi } from "../api/folders";
import { tagsApi } from "../api/tags";
import { workspacesApi, type Workspace } from "../api/workspaces";

const personal: Workspace = {
  id: "ws-personal", name: "Personal", description: "", ownerId: "u1",
  isPersonal: true, color: "#fff", icon: "p", createdAt: "", updatedAt: "",
};
const team: Workspace = {
  id: "ws-team", name: "Team", description: "", ownerId: "u1",
  isPersonal: false, color: "#000", icon: "t", createdAt: "", updatedAt: "",
};

function stubAllApis(overrides: {
  workspaces?: Workspace[];
  diagrams?: unknown;
  folders?: unknown[];
  tags?: unknown[];
} = {}) {
  vi.spyOn(workspacesApi, "list").mockResolvedValue({ workspaces: overrides.workspaces ?? [personal] });
  vi.spyOn(foldersApi, "list").mockResolvedValue({ folders: overrides.folders ?? [] } as never);
  vi.spyOn(tagsApi, "list").mockResolvedValue({ tags: (overrides.tags ?? []) as never });
  vi.spyOn(diagramsApi, "list").mockResolvedValue({ diagrams: overrides.diagrams ?? [] } as never);
  vi.spyOn(diagramsApi, "search").mockResolvedValue({ diagrams: overrides.diagrams ?? [] } as never);
}

describe("useDashboardData", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("on mount loads workspaces and auto-picks personal when none stored", async () => {
    stubAllApis();
    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "" }),
    );
    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe("ws-personal");
    });
    expect(localStorage.getItem("drawhaus_workspace")).toBe("ws-personal");
  });

  test("respects stored workspaceId from localStorage when it matches an existing workspace", async () => {
    localStorage.setItem("drawhaus_workspace", "ws-team");
    stubAllApis({ workspaces: [personal, team] });
    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "" }),
    );
    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe("ws-team");
    });
  });

  test("falls back to personal when stored workspaceId no longer exists", async () => {
    localStorage.setItem("drawhaus_workspace", "ghost-id");
    stubAllApis({ workspaces: [personal, team] });
    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "" }),
    );
    await waitFor(() => {
      expect(result.current.activeWorkspaceId).toBe("ws-personal");
    });
  });

  test("loadData populates diagrams, folders and tags after workspace is set", async () => {
    const diagrams = [{ id: "d1", title: "One", folderId: null, thumbnail: null, updatedAt: "2026-06-01T00:00:00Z" }];
    const folders = [{ id: "f1", name: "Inbox" }];
    const tags = [{ id: "t1", name: "Red", color: "#f00" }];
    stubAllApis({ diagrams, folders, tags });

    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.diagrams.length).toBe(1);
    });
    expect(result.current.folders).toEqual(folders);
    expect(result.current.allTags).toEqual(tags);
  });

  test("uses search endpoint when searchQuery is non-empty", async () => {
    stubAllApis();
    const searchSpy = vi.spyOn(diagramsApi, "search").mockResolvedValue({ diagrams: [] } as never);
    const listSpy = vi.spyOn(diagramsApi, "list");

    renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "hello" }),
    );

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledWith("hello");
    });
    expect(listSpy).not.toHaveBeenCalled();
  });

  test("passes folderId='null' string to diagrams.list when folderId param is null", async () => {
    stubAllApis();
    const listSpy = vi.spyOn(diagramsApi, "list").mockResolvedValue({ diagrams: [] } as never);

    renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: null, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });
    const lastCall = listSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toMatchObject({ workspaceId: "ws-personal", folderId: "null" });
  });

  test("global view (templates) skips workspace and folder params", async () => {
    stubAllApis();
    const listSpy = vi.spyOn(diagramsApi, "list").mockResolvedValue({ diagrams: [] } as never);

    renderHook(() =>
      useDashboardData({ sidebarView: "templates", folderId: undefined, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });
    expect(listSpy.mock.calls.at(-1)?.[0]).toEqual({});
  });

  test("silently swallows API errors during loadData and still sets loading=false", async () => {
    vi.spyOn(workspacesApi, "list").mockResolvedValue({ workspaces: [personal] });
    vi.spyOn(foldersApi, "list").mockRejectedValue(new Error("boom"));
    vi.spyOn(tagsApi, "list").mockResolvedValue({ tags: [] });
    vi.spyOn(diagramsApi, "list").mockResolvedValue({ diagrams: [] } as never);

    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.diagrams).toEqual([]);
  });

  test("displayDiagrams: 'recent' sorts by updatedAt desc and caps at 10", async () => {
    const diagrams = Array.from({ length: 12 }, (_, i) => ({
      id: `d${i}`, title: `D${i}`, folderId: null, thumbnail: null,
      updatedAt: new Date(2026, 0, i + 1).toISOString(),
    }));
    stubAllApis({ diagrams });

    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "recent", folderId: undefined, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(result.current.displayDiagrams.length).toBe(10);
    });
    expect(result.current.displayDiagrams[0].id).toBe("d11");
  });

  test("displayDiagrams: 'starred' returns only starred diagrams", async () => {
    const diagrams = [
      { id: "d1", title: "One", folderId: null, thumbnail: null, starred: true },
      { id: "d2", title: "Two", folderId: null, thumbnail: null, starred: false },
      { id: "d3", title: "Three", folderId: null, thumbnail: null, starred: true },
    ];
    stubAllApis({ diagrams });

    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "starred", folderId: undefined, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(result.current.displayDiagrams.length).toBe(2);
    });
    expect(result.current.displayDiagrams.map((d) => d.id)).toEqual(["d1", "d3"]);
  });

  test("heading/subtitle reflect the active view", async () => {
    stubAllApis({ workspaces: [personal, team] });
    localStorage.setItem("drawhaus_workspace", "ws-team");

    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(result.current.heading).toBe("Team");
    });
    expect(result.current.subtitle).toBe("Team workspace");
  });

  test("heading/subtitle for search show query and pluralized result count", async () => {
    const diagrams = [
      { id: "d1", title: "One", folderId: null, thumbnail: null },
      { id: "d2", title: "Two", folderId: null, thumbnail: null },
    ];
    stubAllApis({ diagrams });

    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "foo" }),
    );

    await waitFor(() => {
      expect(result.current.diagrams.length).toBe(2);
    });
    expect(result.current.heading).toBe('Search: "foo"');
    expect(result.current.subtitle).toBe("2 results");
  });

  test("loadData is callable and refetches on demand", async () => {
    stubAllApis();
    const listSpy = vi.spyOn(diagramsApi, "list").mockResolvedValue({ diagrams: [] } as never);

    const { result } = renderHook(() =>
      useDashboardData({ sidebarView: "all", folderId: undefined, searchQuery: "" }),
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalled();
    });
    const before = listSpy.mock.calls.length;

    await act(async () => {
      await result.current.loadData();
    });

    expect(listSpy.mock.calls.length).toBeGreaterThan(before);
  });
});
