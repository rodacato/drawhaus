import type { Tag } from "@/api/tags";

export function TagBadges({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
