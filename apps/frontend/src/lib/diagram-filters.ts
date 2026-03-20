type WithTimestamp = { updatedAt?: string; updated_at?: string };
type WithStarred = { starred?: boolean };

export function sortByUpdated<T extends WithTimestamp>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const da = new Date(a.updatedAt ?? a.updated_at ?? 0).getTime();
    const db = new Date(b.updatedAt ?? b.updated_at ?? 0).getTime();
    return db - da;
  });
}

export function filterStarred<T extends WithStarred>(items: readonly T[]): T[] {
  return items.filter((d) => d.starred);
}

export function isValidExcalidrawFile(data: unknown): data is { type: "excalidraw"; elements: unknown[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).type === "excalidraw" &&
    Array.isArray((data as Record<string, unknown>).elements)
  );
}
