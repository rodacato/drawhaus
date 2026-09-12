const OPEN = "<";
const CLOSE = ">";

// Same output as stripping /<[^<>]*>/g to a fixed point, so "<<a>script>" cannot re-form a tag.
function sanitizeString(value: string): string {
  const kept: string[] = [];
  let depth = 0;
  let runStart = 0;
  let unclosedFrom = value.length;

  for (let i = 0; i < value.length; i++) {
    if (value[i] === OPEN) {
      if (depth === 0) {
        pushRun(kept, value, runStart, i);
        unclosedFrom = i;
      }
      depth++;
    } else if (value[i] === CLOSE && depth > 0) {
      depth--;
      if (depth === 0) runStart = i + 1;
    }
  }

  if (depth > 0) return kept.join("") + stripFromRight(value, unclosedFrom);
  kept.push(value.slice(runStart));
  return kept.join("");
}

// From the first "<" that never closes, every ">" has a partner, so pairing from the right is exact.
function stripFromRight(value: string, from: number): string {
  const kept: string[] = [];
  let depth = 0;
  let runEnd = value.length;

  for (let i = value.length - 1; i >= from; i--) {
    if (value[i] === CLOSE) {
      if (depth === 0) pushRun(kept, value, i + 1, runEnd);
      depth++;
    } else if (value[i] === OPEN && depth > 0) {
      depth--;
      if (depth === 0) runEnd = i;
    }
  }

  kept.push(value.slice(from, runEnd));
  kept.reverse();
  return kept.join("");
}

function pushRun(kept: string[], value: string, start: number, end: number): void {
  if (end > start) kept.push(value.slice(start, end));
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
