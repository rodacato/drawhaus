import { tagsApi, type Tag } from "@/api/tags";
import type { Diagram } from "./useDashboardData";

export interface UseTagActionsParams {
  setDiagrams: React.Dispatch<React.SetStateAction<Diagram[]>>;
  setAllTags: React.Dispatch<React.SetStateAction<Tag[]>>;
}

function withTagRemoved(diagram: Diagram, tagId: string): Diagram {
  return { ...diagram, tags: (diagram.tags ?? []).filter((t) => t.id !== tagId) };
}

function withTagAdded(diagram: Diagram, tag: Tag): Diagram {
  return { ...diagram, tags: [...(diagram.tags ?? []), tag] };
}

export function useTagActions({ setDiagrams, setAllTags }: UseTagActionsParams) {
  async function toggleTag(diagramId: string, tag: Tag) {
    // We need to read current diagrams via the setter's callback form
    let hasTag = false;
    setDiagrams((prev) => {
      const diagram = prev.find((d) => d.id === diagramId);
      hasTag = diagram?.tags?.some((t) => t.id === tag.id) ?? false;
      return prev; // no-op read
    });

    try {
      if (hasTag) {
        await tagsApi.unassign(tag.id, diagramId);
        setDiagrams((prev) => prev.map((d) => d.id === diagramId ? withTagRemoved(d, tag.id) : d));
      } else {
        await tagsApi.assign(tag.id, diagramId);
        setDiagrams((prev) => prev.map((d) => d.id === diagramId ? withTagAdded(d, tag) : d));
      }
    } catch { /* silent */ }
  }

  async function createTag(name: string, color: string) {
    try {
      const res = await tagsApi.create(name, color);
      setAllTags((prev) => [...prev, res.tag]);
      return res.tag;
    } catch { return null; }
  }

  async function deleteTag(tagId: string) {
    try {
      await tagsApi.delete(tagId);
      setAllTags((prev) => prev.filter((t) => t.id !== tagId));
      setDiagrams((prev) => prev.map((d) => withTagRemoved(d, tagId)));
    } catch { /* silent */ }
  }

  return { toggleTag, createTag, deleteTag };
}
