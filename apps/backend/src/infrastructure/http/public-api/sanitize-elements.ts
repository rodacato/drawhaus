const HTML_TAG_RE = /<[^<>]*>/g;

// Repeats to a fixed point: one pass turns "<<a>script>" back into a live "<script>".
function sanitizeString(value: string): string {
  let previous: string;
  let current = value;
  do {
    previous = current;
    current = current.replace(HTML_TAG_RE, "");
  } while (current !== previous);
  return current;
}

export function sanitizeElements(elements: unknown[]): unknown[] {
  return elements.map((el) => {
    if (typeof el !== "object" || el === null) return el;
    const obj = el as Record<string, unknown>;
    if (typeof obj.text === "string") {
      return { ...obj, text: sanitizeString(obj.text) };
    }
    return el;
  });
}
