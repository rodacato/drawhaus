import type { ExcalidrawElementSkeleton } from "./types.js";

let idCounter = 0;
function nextId(): string {
  return `mermaid_${Date.now()}_${++idCounter}`;
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
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeWidth?: number;
  fillStyle?: string;
}): ExcalidrawElementSkeleton {
  return {
    type: "rectangle",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    id: nextId(),
    strokeStyle: opts.strokeStyle,
    strokeColor: opts.strokeColor,
    strokeWidth: opts.strokeWidth,
    backgroundColor: opts.backgroundColor ?? "transparent",
    fillStyle: opts.fillStyle ?? "solid",
    roundness: opts.roundness ? { type: 3, value: opts.roundness } : null,
    ...(opts.label
      ? { label: { text: opts.label, x: opts.x, y: opts.y } }
      : {}),
  };
}

export function createText(opts: {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  color?: string;
}): ExcalidrawElementSkeleton {
  return {
    type: "text",
    x: opts.x,
    y: opts.y,
    text: opts.text,
    id: nextId(),
    fontSize: opts.fontSize ?? 16,
    textAlign: opts.textAlign ?? "left",
    ...(opts.color ? { strokeColor: opts.color } : {}),
  };
}

export function createArrow(opts: {
  points: Array<{ x: number; y: number }>;
  label?: string;
  startArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  endArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeColor?: string;
  strokeWidth?: number;
  startId?: string;
  endId?: string;
}): ExcalidrawElementSkeleton {
  const first = opts.points[0];
  const last = opts.points[opts.points.length - 1];
  const relativePoints = opts.points.map((p) => [
    p.x - first.x,
    p.y - first.y,
  ]);

  const midIdx = Math.floor(opts.points.length / 2);
  const midPoint = opts.points[midIdx];

  return {
    type: "arrow",
    x: first.x,
    y: first.y,
    width: last.x - first.x,
    height: last.y - first.y,
    id: nextId(),
    points: relativePoints,
    startArrowhead: opts.startArrowhead !== undefined ? opts.startArrowhead : null,
    endArrowhead: opts.endArrowhead !== undefined ? opts.endArrowhead : "arrow",
    strokeStyle: opts.strokeStyle ?? "solid",
    strokeColor: opts.strokeColor,
    strokeWidth: opts.strokeWidth,
    ...(opts.label
      ? { label: { text: opts.label, x: midPoint.x, y: midPoint.y } }
      : {}),
    ...(opts.startId ? { start: { id: opts.startId } } : {}),
    ...(opts.endId ? { end: { id: opts.endId } } : {}),
  };
}

export function createDiamond(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
}): ExcalidrawElementSkeleton {
  return {
    type: "diamond",
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    id: nextId(),
    backgroundColor: opts.backgroundColor ?? "transparent",
    strokeColor: opts.strokeColor,
    strokeStyle: opts.strokeStyle ?? "solid",
    fillStyle: "solid",
    ...(opts.label
      ? { label: { text: opts.label, x: opts.x, y: opts.y } }
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
  strokeColor?: string;
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
    strokeColor: opts.strokeColor,
    strokeStyle: opts.strokeStyle ?? "solid",
    fillStyle: "solid",
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
  strokeColor?: string;
  strokeWidth?: number;
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
    strokeColor: opts.strokeColor,
    strokeWidth: opts.strokeWidth,
  };
}
