import type { ExcalidrawElement } from "./types.js";

let idCounter = 0;

function nextId(prefix = "el"): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

const BASE_DEFAULTS = {
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "solid" as const,
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  roughness: 1,
  opacity: 100,
  roundness: null,
  groupIds: [],
};

export function createRect(opts: {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeWidth?: number;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  roundness?: number;
  roughness?: number;
  opacity?: number;
}): ExcalidrawElement {
  return {
    ...BASE_DEFAULTS,
    type: "rectangle",
    id: opts.id ?? nextId("rect"),
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor ?? BASE_DEFAULTS.strokeColor,
    backgroundColor: opts.backgroundColor ?? BASE_DEFAULTS.backgroundColor,
    strokeStyle: opts.strokeStyle ?? BASE_DEFAULTS.strokeStyle,
    strokeWidth: opts.strokeWidth ?? BASE_DEFAULTS.strokeWidth,
    fillStyle: opts.fillStyle ?? BASE_DEFAULTS.fillStyle,
    roughness: opts.roughness ?? BASE_DEFAULTS.roughness,
    opacity: opts.opacity ?? BASE_DEFAULTS.opacity,
    roundness: opts.roundness ? { type: 3, value: opts.roundness } : null,
    ...(opts.label
      ? { label: { text: opts.label, x: opts.x, y: opts.y } }
      : {}),
  };
}

export function createText(opts: {
  id?: string;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: 1 | 2 | 3;
  textAlign?: "left" | "center" | "right";
  strokeColor?: string;
  opacity?: number;
}): ExcalidrawElement {
  return {
    ...BASE_DEFAULTS,
    type: "text",
    id: opts.id ?? nextId("text"),
    x: opts.x,
    y: opts.y,
    width: 0,
    height: 0,
    text: opts.text,
    fontSize: opts.fontSize ?? 16,
    fontFamily: opts.fontFamily ?? 1,
    textAlign: opts.textAlign ?? "left",
    strokeColor: opts.strokeColor ?? BASE_DEFAULTS.strokeColor,
    opacity: opts.opacity ?? BASE_DEFAULTS.opacity,
  };
}

export function createArrow(opts: {
  id?: string;
  points: Array<{ x: number; y: number }>;
  label?: string;
  startArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  endArrowhead?: "arrow" | "bar" | "dot" | "triangle" | "diamond" | null;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeColor?: string;
  strokeWidth?: number;
  startBinding?: { elementId: string };
  endBinding?: { elementId: string };
  opacity?: number;
}): ExcalidrawElement {
  const first = opts.points[0];
  const last = opts.points[opts.points.length - 1];

  const relativePoints: Array<[number, number]> = opts.points.map((p) => [
    p.x - first.x,
    p.y - first.y,
  ]);

  const midIdx = Math.floor(opts.points.length / 2);
  const midPoint = opts.points[midIdx];

  return {
    ...BASE_DEFAULTS,
    type: "arrow",
    id: opts.id ?? nextId("arrow"),
    x: first.x,
    y: first.y,
    width: last.x - first.x,
    height: last.y - first.y,
    points: relativePoints,
    startArrowhead: opts.startArrowhead ?? null,
    endArrowhead: opts.endArrowhead ?? "arrow",
    strokeStyle: opts.strokeStyle ?? BASE_DEFAULTS.strokeStyle,
    strokeColor: opts.strokeColor ?? BASE_DEFAULTS.strokeColor,
    strokeWidth: opts.strokeWidth ?? BASE_DEFAULTS.strokeWidth,
    opacity: opts.opacity ?? BASE_DEFAULTS.opacity,
    ...(opts.label
      ? { label: { text: opts.label, x: midPoint.x, y: midPoint.y } }
      : {}),
    ...(opts.startBinding
      ? { startBinding: { elementId: opts.startBinding.elementId, focus: 0, gap: 5 } }
      : {}),
    ...(opts.endBinding
      ? { endBinding: { elementId: opts.endBinding.elementId, focus: 0, gap: 5 } }
      : {}),
  };
}

export function createLine(opts: {
  id?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
}): ExcalidrawElement {
  return {
    ...BASE_DEFAULTS,
    type: "line",
    id: opts.id ?? nextId("line"),
    x: opts.startX,
    y: opts.startY,
    width: opts.endX - opts.startX,
    height: opts.endY - opts.startY,
    points: [
      [0, 0],
      [opts.endX - opts.startX, opts.endY - opts.startY],
    ],
    strokeStyle: opts.strokeStyle ?? BASE_DEFAULTS.strokeStyle,
    strokeColor: opts.strokeColor ?? BASE_DEFAULTS.strokeColor,
    strokeWidth: opts.strokeWidth ?? BASE_DEFAULTS.strokeWidth,
    opacity: opts.opacity ?? BASE_DEFAULTS.opacity,
  };
}

export function createDiamond(opts: {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  opacity?: number;
}): ExcalidrawElement {
  return {
    ...BASE_DEFAULTS,
    type: "diamond",
    id: opts.id ?? nextId("diamond"),
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor ?? BASE_DEFAULTS.strokeColor,
    backgroundColor: opts.backgroundColor ?? BASE_DEFAULTS.backgroundColor,
    strokeStyle: opts.strokeStyle ?? BASE_DEFAULTS.strokeStyle,
    fillStyle: opts.fillStyle ?? BASE_DEFAULTS.fillStyle,
    opacity: opts.opacity ?? BASE_DEFAULTS.opacity,
    ...(opts.label
      ? { label: { text: opts.label, x: opts.x, y: opts.y } }
      : {}),
  };
}

export function createEllipse(opts: {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  opacity?: number;
}): ExcalidrawElement {
  return {
    ...BASE_DEFAULTS,
    type: "ellipse",
    id: opts.id ?? nextId("ellipse"),
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    strokeColor: opts.strokeColor ?? BASE_DEFAULTS.strokeColor,
    backgroundColor: opts.backgroundColor ?? BASE_DEFAULTS.backgroundColor,
    strokeStyle: opts.strokeStyle ?? BASE_DEFAULTS.strokeStyle,
    fillStyle: opts.fillStyle ?? BASE_DEFAULTS.fillStyle,
    opacity: opts.opacity ?? BASE_DEFAULTS.opacity,
    ...(opts.label
      ? { label: { text: opts.label, x: opts.x, y: opts.y } }
      : {}),
  };
}
