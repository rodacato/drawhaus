import { tagsApi, type Tag } from "@/api/tags";
import type { Diagram } from "./useDashboardData";

export interface UseTagActionsParams {
  setDiagrams: React.Dispatch<React.SetStateAction<Diagram[]>>;
  setAllTags: React.Dispatch<React.SetStateAction<Tag[]>>;
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
        setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, tags: (d.tags ?? []).filter((t) => t.id !== tag.id) } : d));
      } else {
        await tagsApi.assign(tag.id, diagramId);
        setDiagrams((prev) => prev.map((d) => d.id === diagramId ? { ...d, tags: [...(d.tags ?? []), tag] } : d));
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
      setDiagrams((prev) => prev.map((d) => ({ ...d, tags: (d.tags ?? []).filter((t) => t.id !== tagId) })));
    } catch { /* silent */ }
  }

  return { toggleTag, createTag, deleteTag };
}
