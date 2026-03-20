import type { Box } from "./types.js";

/**
 * Find the point on a box's border closest to a target point,
 * along the line from box center to target.
 */
export function clampToBoxBorder(
  box: Box,
  target: { x: number; y: number },
): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: box.y + box.height }; // default: bottom center
  }

  const hw = box.width / 2;
  const hh = box.height / 2;

  // Scale factor to reach the box border along the direction vector
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
}

/**
 * Build arrow points from dagre waypoints, clamping start/end to box borders.
 * Falls back to smart border-to-border connection if no dagre points.
 */
export function buildArrowPoints(
  source: Box,
  target: Box,
  dagrePoints?: Array<{ x: number; y: number }>,
): Array<{ x: number; y: number }> {
  if (dagrePoints && dagrePoints.length >= 2) {
    const firstWaypoint = dagrePoints[1] ?? dagrePoints[0];
    const lastWaypoint =
      dagrePoints[dagrePoints.length - 2] ??
      dagrePoints[dagrePoints.length - 1];

    const start = clampToBoxBorder(source, firstWaypoint);
    const end = clampToBoxBorder(target, lastWaypoint);

    const inner = dagrePoints.slice(1, -1);
    return [start, ...inner, end];
  }

  // Fallback: simple border-to-border connection
  const sCenterX = source.x + source.width / 2;
  const sCenterY = source.y + source.height / 2;
  const tCenterX = target.x + target.width / 2;
  const tCenterY = target.y + target.height / 2;

  const start = clampToBoxBorder(source, { x: tCenterX, y: tCenterY });
  const end = clampToBoxBorder(target, { x: sCenterX, y: sCenterY });

  return [start, end];
}
