import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDiagramActions } from "../lib/hooks/useDiagramActions";
import { diagramsApi } from "../api/diagrams";
import { foldersApi } from "../api/folders";
import { templatesApi } from "../api/templates";
import { shareApi } from "../api/share";
import type { Diagram } from "../lib/hooks/useDashboardData";

type SetupOpts = {
  diagrams?: Diagram[];
  folderId?: string | null;
  activeWorkspaceId?: string | null;
  confirmAnswer?: boolean;
};

function setup(opts: SetupOpts = {}) {
  let diagrams = opts.diagrams ?? [];
  const navigate = vi.fn();
  const toast = vi.fn();
  const confirm = vi.fn().mockResolvedValue(opts.confirmAnswer ?? true);
  const loadData = vi.fn();
  const setDiagrams = vi.fn((updater: Diagram[] | ((prev: Diagram[]) => Diagram[])) => {
    diagrams = typeof updater === "function" ? updater(diagrams) : updater;
  });

  const { result } = renderHook(() =>
    useDiagramActions({
      navigate,
      toast,
      confirm,
      loadData,
      setDiagrams: setDiagrams as unknown as React.Dispatch<React.SetStateAction<Diagram[]>>,
      diagrams,
      folderId: opts.folderId ?? null,
      activeWorkspaceId: opts.activeWorkspaceId ?? "ws-1",
    }),
  );

  return { result, navigate, toast, confirm, loadData, setDiagrams, getDiagrams: () => diagrams };
}

describe("useDiagramActions", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("createBlankDiagram", () => {
    test("navigates to /board/:id on success and clears template picker", async () => {
      vi.spyOn(diagramsApi, "create").mockResolvedValue({ diagram: { id: "new-1" } } as never);
      const { result, navigate } = setup();

      act(() => result.current.openTemplatePicker("f1"));
      expect(result.current.templatePickerOpen).toBe(true);

      await act(async () => {
        await result.current.createBlankDiagram();
      });

      expect(navigate).toHaveBeenCalledWith("/board/new-1");
      expect(result.current.templatePickerOpen).toBe(false);
    });

    test("toasts info + loadData when response is missing id", async () => {
      vi.spyOn(diagramsApi, "create").mockResolvedValue({ diagram: {} } as never);
      const { result, toast, loadData } = setup();

      await act(async () => {
        await result.current.createBlankDiagram();
      });

      expect(toast).toHaveBeenCalledWith("Diagram created, but missing id.", "info");
      expect(loadData).toHaveBeenCalled();
    });

    test("toasts error on API failure", async () => {
      vi.spyOn(diagramsApi, "create").mockRejectedValue(new Error("boom"));
      const { result, toast } = setup();

      await act(async () => {
        await result.current.createBlankDiagram();
      });

      expect(toast).toHaveBeenCalledWith("Could not create diagram.", "error");
    });
  });

  describe("createFromBuiltIn", () => {
    test("forwards template elements + appState and navigates on success", async () => {
      const createSpy = vi.spyOn(diagramsApi, "create").mockResolvedValue({ diagram: { id: "x" } } as never);
      const { result, navigate } = setup({ folderId: "f1", activeWorkspaceId: "ws-9" });

      await act(async () => {
        await result.current.createFromBuiltIn({ name: "Flow", elements: [1, 2], appState: { a: 1 } });
      });

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: "Flow",
        folderId: "f1",
        workspaceId: "ws-9",
        elements: [1, 2],
        appState: { a: 1 },
      }));
      expect(navigate).toHaveBeenCalledWith("/board/x");
    });

    test("toasts error on API failure", async () => {
      vi.spyOn(diagramsApi, "create").mockRejectedValue(new Error("boom"));
      const { result, toast } = setup();
      await act(async () => {
        await result.current.createFromBuiltIn({ name: "X", elements: [], appState: {} });
      });
      expect(toast).toHaveBeenCalledWith("Could not create diagram.", "error");
    });
  });

  describe("createFromTemplate", () => {
    test("calls templatesApi.use with title + folder + workspace and navigates", async () => {
      const useSpy = vi.spyOn(templatesApi, "use").mockResolvedValue({ diagram: { id: "tpl-1", title: "T" } });
      const { result, navigate } = setup({ folderId: "f1", activeWorkspaceId: "ws-9" });

      await act(async () => {
        await result.current.createFromTemplate("tpl", "T");
      });

      expect(useSpy).toHaveBeenCalledWith("tpl", { title: "T", folderId: "f1", workspaceId: "ws-9" });
      expect(navigate).toHaveBeenCalledWith("/board/tpl-1");
    });

    test("toasts error on failure", async () => {
      vi.spyOn(templatesApi, "use").mockRejectedValue(new Error("boom"));
      const { result, toast } = setup();
      await act(async () => {
        await result.current.createFromTemplate("tpl", "T");
      });
      expect(toast).toHaveBeenCalledWith("Could not create diagram.", "error");
    });
  });

  describe("deleteDiagram", () => {
    test("does nothing when confirm returns false", async () => {
      const deleteSpy = vi.spyOn(diagramsApi, "delete").mockResolvedValue({} as never);
      const { result, loadData } = setup({ confirmAnswer: false });

      await act(async () => {
        await result.current.diagramActions.onDelete("d1", "Title");
      });

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(loadData).not.toHaveBeenCalled();
    });

    test("happy path: deletes, toasts and reloads", async () => {
      vi.spyOn(diagramsApi, "delete").mockResolvedValue({} as never);
      const { result, toast, loadData } = setup();

      await act(async () => {
        await result.current.diagramActions.onDelete("d1", "Title");
      });

      expect(toast).toHaveBeenCalledWith("Diagram deleted");
      expect(loadData).toHaveBeenCalled();
    });

    test("toasts error on failure", async () => {
      vi.spyOn(diagramsApi, "delete").mockRejectedValue(new Error("boom"));
      const { result, toast } = setup();

      await act(async () => {
        await result.current.diagramActions.onDelete("d1", "Title");
      });

      expect(toast).toHaveBeenCalledWith("Failed to delete diagram.", "error");
    });
  });

  describe("duplicateDiagram", () => {
    test("navigates to duplicated diagram", async () => {
      vi.spyOn(diagramsApi, "duplicate").mockResolvedValue({ diagram: { id: "dup-1" } } as never);
      const { result, navigate } = setup();

      await act(async () => {
        await result.current.diagramActions.onDuplicate("d1");
      });

      expect(navigate).toHaveBeenCalledWith("/board/dup-1");
    });

    test("falls back to loadData when id missing", async () => {
      vi.spyOn(diagramsApi, "duplicate").mockResolvedValue({ diagram: {} } as never);
      const { result, loadData, navigate } = setup();

      await act(async () => {
        await result.current.diagramActions.onDuplicate("d1");
      });

      expect(navigate).not.toHaveBeenCalled();
      expect(loadData).toHaveBeenCalled();
    });
  });

  describe("toggleStar", () => {
    test("optimistically updates the matching diagram", async () => {
      vi.spyOn(diagramsApi, "toggleStar").mockResolvedValue({} as never);
      const diagrams: Diagram[] = [
        { id: "d1", title: "A", folderId: null, thumbnail: null, starred: false },
        { id: "d2", title: "B", folderId: null, thumbnail: null, starred: false },
      ];
      const { result, getDiagrams } = setup({ diagrams });

      await act(async () => {
        await result.current.diagramActions.onToggleStar("d1", true);
      });

      expect(getDiagrams().find((d) => d.id === "d1")?.starred).toBe(true);
      expect(getDiagrams().find((d) => d.id === "d2")?.starred).toBe(false);
    });
  });

  describe("renameDiagram", () => {
    test("trims title and updates state", async () => {
      const updateSpy = vi.spyOn(diagramsApi, "update").mockResolvedValue({} as never);
      const diagrams: Diagram[] = [{ id: "d1", title: "Old", folderId: null, thumbnail: null }];
      const { result, getDiagrams } = setup({ diagrams });

      await act(async () => {
        await result.current.diagramActions.onRename("d1", "  New  ");
      });

      expect(updateSpy).toHaveBeenCalledWith("d1", { title: "New" });
      expect(getDiagrams()[0].title).toBe("New");
    });

    test("no-ops on whitespace-only title", async () => {
      const updateSpy = vi.spyOn(diagramsApi, "update").mockResolvedValue({} as never);
      const { result } = setup();
      await act(async () => {
        await result.current.diagramActions.onRename("d1", "   ");
      });
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("embedDiagram", () => {
    test("creates share link, caches in localStorage, copies embed snippet, toasts", async () => {
      const createSpy = vi.spyOn(shareApi, "create").mockResolvedValue({ shareLink: { token: "tok-1" } } as never);
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

      const { result, toast } = setup();
      await act(async () => {
        await result.current.diagramActions.onEmbed("d1");
      });

      expect(createSpy).toHaveBeenCalledWith("d1", "viewer");
      const cached = localStorage.getItem("drawhaus_share_d1_viewer");
      expect(cached).toContain("/share/tok-1");
      expect(writeText.mock.calls[0][0]).toContain("/embed/tok-1");
      expect(toast).toHaveBeenCalledWith("Embed code copied!");
    });

    test("reuses cached share URL without calling shareApi.create", async () => {
      localStorage.setItem("drawhaus_share_d1_viewer", "http://localhost/share/cached-tok");
      const createSpy = vi.spyOn(shareApi, "create");
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

      const { result } = setup();
      await act(async () => {
        await result.current.diagramActions.onEmbed("d1");
      });

      expect(createSpy).not.toHaveBeenCalled();
      expect(writeText.mock.calls[0][0]).toContain("/embed/cached-tok");
    });
  });

  describe("saveAsTemplate", () => {
    test("reads diagram and creates template with workspace id", async () => {
      vi.spyOn(diagramsApi, "get").mockResolvedValue({
        diagram: { id: "d1", elements: [1], appState: { a: 1 }, thumbnail: "thumb" },
      } as never);
      const createSpy = vi.spyOn(templatesApi, "create").mockResolvedValue({} as never);
      const { result, toast } = setup({ activeWorkspaceId: "ws-9" });

      await act(async () => {
        await result.current.diagramActions.onSaveAsTemplate("d1", "My Diagram");
      });

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        title: "My Diagram Template",
        elements: [1],
        appState: { a: 1 },
        workspaceId: "ws-9",
        thumbnail: "thumb",
      }));
      expect(toast).toHaveBeenCalledWith("Template saved!");
    });

    test("toasts error on failure", async () => {
      vi.spyOn(diagramsApi, "get").mockRejectedValue(new Error("boom"));
      const { result, toast } = setup();
      await act(async () => {
        await result.current.diagramActions.onSaveAsTemplate("d1", "X");
      });
      expect(toast).toHaveBeenCalledWith("Could not save template.", "error");
    });
  });

  describe("createFolder + deleteFolder", () => {
    test("createFolder: no-op on empty name", async () => {
      const createSpy = vi.spyOn(foldersApi, "create");
      const { result, loadData } = setup();
      await act(async () => {
        await result.current.createFolder("   ");
      });
      expect(createSpy).not.toHaveBeenCalled();
      expect(loadData).not.toHaveBeenCalled();
    });

    test("createFolder: happy path trims and reloads", async () => {
      const createSpy = vi.spyOn(foldersApi, "create").mockResolvedValue({} as never);
      const { result, loadData } = setup({ activeWorkspaceId: "ws-9" });
      await act(async () => {
        await result.current.createFolder("  Inbox  ");
      });
      expect(createSpy).toHaveBeenCalledWith("Inbox", "ws-9");
      expect(loadData).toHaveBeenCalled();
    });

    test("deleteFolder: refuses when folder still contains diagrams", async () => {
      const deleteSpy = vi.spyOn(foldersApi, "delete");
      const diagrams: Diagram[] = [{ id: "d1", title: "X", folderId: "f1", thumbnail: null }];
      const { result, toast } = setup({ diagrams });
      const setSearchParams = vi.fn();

      await act(async () => {
        await result.current.deleteFolder("f1", setSearchParams);
      });

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(
        "Cannot delete this folder because it still contains diagrams. Move or delete them first.",
        "error",
      );
    });

    test("deleteFolder: happy path clears active folder param, toasts and reloads", async () => {
      vi.spyOn(foldersApi, "delete").mockResolvedValue({} as never);
      const { result, toast, loadData } = setup({ folderId: "f1" });
      const setSearchParams = vi.fn();

      await act(async () => {
        await result.current.deleteFolder("f1", setSearchParams);
      });

      expect(setSearchParams).toHaveBeenCalledWith({});
      expect(toast).toHaveBeenCalledWith("Folder deleted");
      expect(loadData).toHaveBeenCalled();
    });

    test("deleteFolder: respects user cancel", async () => {
      const deleteSpy = vi.spyOn(foldersApi, "delete");
      const { result } = setup({ confirmAnswer: false });
      await act(async () => {
        await result.current.deleteFolder("f1", vi.fn());
      });
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });

  describe("handleImport", () => {
    function makeEvent(file: File | null): React.ChangeEvent<HTMLInputElement> {
      const files = file ? ([file] as unknown as FileList) : (null as unknown as FileList);
      const target = { files, value: "x" } as unknown as HTMLInputElement;
      return { target } as React.ChangeEvent<HTMLInputElement>;
    }

    test("no-op when no file selected", async () => {
      const createSpy = vi.spyOn(diagramsApi, "create");
      const { result } = setup();
      await act(async () => {
        await result.current.handleImport(makeEvent(null));
      });
      expect(createSpy).not.toHaveBeenCalled();
    });

    test("toasts error on invalid excalidraw file shape", async () => {
      const file = new File(['{"type":"not-excalidraw"}'], "bad.excalidraw", { type: "application/json" });
      const { result, toast } = setup();
      await act(async () => {
        await result.current.handleImport(makeEvent(file));
      });
      expect(toast).toHaveBeenCalledWith("Invalid .excalidraw file.", "error");
    });

    test("happy path: creates diagram from file and navigates", async () => {
      const file = new File(
        ['{"type":"excalidraw","elements":[1,2]}'],
        "My Drawing.excalidraw",
        { type: "application/json" },
      );
      const createSpy = vi.spyOn(diagramsApi, "create").mockResolvedValue({ diagram: { id: "imp-1" } } as never);
      const { result, navigate } = setup();

      await act(async () => {
        await result.current.handleImport(makeEvent(file));
      });

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ title: "My Drawing", elements: [1, 2] }));
      expect(navigate).toHaveBeenCalledWith("/board/imp-1");
    });
  });
});
