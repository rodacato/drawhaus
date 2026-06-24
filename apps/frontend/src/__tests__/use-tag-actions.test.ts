import { describe, test, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTagActions } from "../lib/hooks/useTagActions";
import { tagsApi, type Tag } from "../api/tags";
import type { Diagram } from "../lib/hooks/useDashboardData";

const tagRed: Tag = { id: "t1", name: "Red", color: "#f00" };
const tagBlue: Tag = { id: "t2", name: "Blue", color: "#00f" };

function setup(initialDiagrams: Diagram[] = [], initialTags: Tag[] = []) {
  let diagrams = initialDiagrams;
  let tags = initialTags;
  const setDiagrams = vi.fn((updater: Diagram[] | ((prev: Diagram[]) => Diagram[])) => {
    diagrams = typeof updater === "function" ? updater(diagrams) : updater;
  });
  const setAllTags = vi.fn((updater: Tag[] | ((prev: Tag[]) => Tag[])) => {
    tags = typeof updater === "function" ? updater(tags) : updater;
  });
  const { result } = renderHook(() =>
    useTagActions({
      diagrams: initialDiagrams,
      setDiagrams: setDiagrams as unknown as React.Dispatch<React.SetStateAction<Diagram[]>>,
      setAllTags: setAllTags as unknown as React.Dispatch<React.SetStateAction<Tag[]>>,
    }),
  );
  return { result, getDiagrams: () => diagrams, getTags: () => tags, setDiagrams, setAllTags };
}

describe("useTagActions", () => {
  beforeEach(() => vi.restoreAllMocks());

  test("toggleTag assigns tag when diagram doesn't have it", async () => {
    const diagram: Diagram = { id: "d1", title: "X", folderId: null, thumbnail: null, tags: [] };
    const { result, getDiagrams } = setup([diagram]);
    const assignSpy = vi.spyOn(tagsApi, "assign").mockResolvedValue({} as never);

    await act(async () => {
      await result.current.toggleTag("d1", tagRed);
    });

    expect(assignSpy).toHaveBeenCalledWith("t1", "d1");
    expect(getDiagrams()[0].tags).toEqual([tagRed]);
  });

  test("toggleTag unassigns tag when diagram already has it", async () => {
    const diagram: Diagram = { id: "d1", title: "X", folderId: null, thumbnail: null, tags: [tagRed, tagBlue] };
    const { result, getDiagrams } = setup([diagram]);
    const unassignSpy = vi.spyOn(tagsApi, "unassign").mockResolvedValue({} as never);

    await act(async () => {
      await result.current.toggleTag("d1", tagRed);
    });

    expect(unassignSpy).toHaveBeenCalledWith("t1", "d1");
    expect(getDiagrams()[0].tags).toEqual([tagBlue]);
  });

  test("toggleTag is silent on API error and does not mutate state", async () => {
    const diagram: Diagram = { id: "d1", title: "X", folderId: null, thumbnail: null, tags: [] };
    const { result, getDiagrams } = setup([diagram]);
    vi.spyOn(tagsApi, "assign").mockRejectedValue(new Error("boom"));

    await act(async () => {
      await result.current.toggleTag("d1", tagRed);
    });

    expect(getDiagrams()[0].tags).toEqual([]);
  });

  test("createTag appends new tag and returns it", async () => {
    const { result, getTags } = setup([], []);
    vi.spyOn(tagsApi, "create").mockResolvedValue({ tag: tagRed });

    let returned: Tag | null = null;
    await act(async () => {
      returned = await result.current.createTag("Red", "#f00");
    });

    expect(returned).toEqual(tagRed);
    expect(getTags()).toEqual([tagRed]);
  });

  test("createTag returns null on API error and leaves tag list untouched", async () => {
    const { result, getTags } = setup([], [tagBlue]);
    vi.spyOn(tagsApi, "create").mockRejectedValue(new Error("boom"));

    let returned: Tag | null = tagRed;
    await act(async () => {
      returned = await result.current.createTag("Red", "#f00");
    });

    expect(returned).toBeNull();
    expect(getTags()).toEqual([tagBlue]);
  });

  test("deleteTag removes tag from list and strips it from every diagram", async () => {
    const diagrams: Diagram[] = [
      { id: "d1", title: "A", folderId: null, thumbnail: null, tags: [tagRed, tagBlue] },
      { id: "d2", title: "B", folderId: null, thumbnail: null, tags: [tagRed] },
    ];
    const { result, getTags, getDiagrams } = setup(diagrams, [tagRed, tagBlue]);
    vi.spyOn(tagsApi, "delete").mockResolvedValue({} as never);

    await act(async () => {
      await result.current.deleteTag("t1");
    });

    expect(getTags()).toEqual([tagBlue]);
    expect(getDiagrams()[0].tags).toEqual([tagBlue]);
    expect(getDiagrams()[1].tags).toEqual([]);
  });

  test("deleteTag is silent on API error", async () => {
    const { result, getTags } = setup([], [tagRed]);
    vi.spyOn(tagsApi, "delete").mockRejectedValue(new Error("boom"));

    await act(async () => {
      await result.current.deleteTag("t1");
    });

    expect(getTags()).toEqual([tagRed]);
  });
});
