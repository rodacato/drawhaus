import type { ExcalidrawElementSkeleton } from "./types.js";

let idCounter = 0;
function nextId(): string {
  return `plantuml_${Date.now()}_${++idCounter}`;
}

export function resetIdCounter() {
  idCounter = 0;
}

export function createRect(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  roundness?: number;
  backgroundColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
}): ExcalidrawElementSkeleton {
  const skeleton: ExcalidrawElementSkeleton = {
    type: "rectangle",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    id: nextId(),
    strokeStyle: opts.strokeStyle,
    backgroundColor: opts.backgroundColor ?? "transparent",
    roundness: opts.roundness ? { type: 3, value: opts.roundness } : null,
    ...(opts.label
      ? {
          label: {
            text: opts.label,
            x: opts.x,
            y: opts.y,
          },
        }
      : {}),
  };
  return skeleton;
}

export function createText(opts: {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
}): ExcalidrawElementSkeleton {
  return {
    type: "text",
    x: opts.x,
    y: opts.y,
    text: opts.text,
    id: nextId(),
    fontSize: opts.fontSize ?? 16,
    textAlign: opts.textAlign ?? "left",
  };
}

export function createArrow(opts: {
  points: Array<{ x: number; y: number }>;
  label?: string;
  startArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  endArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  strokeStyle?: "solid" | "dashed" | "dotted";
  startId?: string;
  endId?: string;
}): ExcalidrawElementSkeleton {
  const first = opts.points[0];
  const last = opts.points[opts.points.length - 1];
  // Convert absolute points to relative (from first point)
  const relativePoints = opts.points.map((p) => [
    p.x - first.x,
    p.y - first.y,
  ]);

  // Label position at midpoint of the path
  const midIdx = Math.floor(opts.points.length / 2);
  const midPoint = opts.points[midIdx];

  const skeleton: ExcalidrawElementSkeleton = {
    type: "arrow",
    x: first.x,
    y: first.y,
    width: last.x - first.x,
    height: last.y - first.y,
    id: nextId(),
    points: relativePoints,
    startArrowhead: opts.startArrowhead ?? null,
    endArrowhead: opts.endArrowhead ?? "arrow",
    strokeStyle: opts.strokeStyle ?? "solid",
    ...(opts.label
      ? {
          label: {
            text: opts.label,
            x: midPoint.x,
            y: midPoint.y,
          },
        }
      : {}),
    ...(opts.startId ? { start: { id: opts.startId } } : {}),
    ...(opts.endId ? { end: { id: opts.endId } } : {}),
  };
  return skeleton;
}

export function createDiamond(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}): ExcalidrawElementSkeleton {
  return {
    type: "diamond",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    id: nextId(),
    ...(opts.label
      ? {
          label: {
            text: opts.label,
            x: opts.x,
            y: opts.y,
          },
        }
      : {}),
  };
}

export function createEllipse(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  backgroundColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
}): ExcalidrawElementSkeleton {
  return {
    type: "ellipse",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    id: nextId(),
    backgroundColor: opts.backgroundColor ?? "transparent",
    strokeStyle: opts.strokeStyle ?? "solid",
    ...(opts.label
      ? { label: { text: opts.label, x: opts.x, y: opts.y } }
      : {}),
  };
}

export function createLine(opts: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
}): ExcalidrawElementSkeleton {
  return {
    type: "line",
    x: opts.startX,
    y: opts.startY,
    width: opts.endX - opts.startX,
    height: opts.endY - opts.startY,
    id: nextId(),
    points: [
      [0, 0],
      [opts.endX - opts.startX, opts.endY - opts.startY],
    ],
    strokeStyle: opts.strokeStyle ?? "solid",
  };
}
