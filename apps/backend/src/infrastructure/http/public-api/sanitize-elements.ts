const HTML_TAG_RE = /<[^>]*>/g;

function sanitizeString(value: string): string {
  return value.replace(HTML_TAG_RE, "");
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
