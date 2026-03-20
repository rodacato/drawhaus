export function countElementComments(
  threads: ReadonlyArray<{ elementId: string; resolved: boolean }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of threads) {
    if (!t.resolved) {
      map.set(t.elementId, (map.get(t.elementId) ?? 0) + 1);
    }
  }
  return map;
}
