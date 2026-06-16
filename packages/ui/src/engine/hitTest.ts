// ─── Hit-Testing Utilities ───────────────────────────────────────────────────
// All coordinates are in WORLD space.

import type { Shape, HandleId } from "../types";

const HIT_THRESHOLD = 8; // px tolerance (in world units) for line/border clicks
const HANDLE_SIZE = 8;   // px size of handle hit area (in world units)

// ─── Bounding box helpers ────────────────────────────────────────────────────

/** Get normalised bounding box (minX, minY, maxX, maxY) of a shape */
export function getBounds(shape: Shape): { minX: number; minY: number; maxX: number; maxY: number } {
  if ((shape.type === "line" || shape.type === "arrow") && shape.points && shape.points.length >= 2) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [px, py] of shape.points) {
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    return { minX, minY, maxX, maxY };
  }
  return {
    minX: Math.min(shape.x1, shape.x2),
    minY: Math.min(shape.y1, shape.y2),
    maxX: Math.max(shape.x1, shape.x2),
    maxY: Math.max(shape.y1, shape.y2),
  };
}

// ─── Distance helpers ────────────────────────────────────────────────────────

/** Distance from point (px, py) to line segment (ax, ay)-(bx, by) */
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/** Check if point is inside a polygon (array of [x,y] vertices) */
function pointInPolygon(px: number, py: number, vertices: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, yi] = vertices[i]!;
    const [xj, yj] = vertices[j]!;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Check if point is near the border of a polygon */
function nearPolygonBorder(px: number, py: number, vertices: [number, number][], threshold: number): boolean {
  for (let i = 0; i < vertices.length; i++) {
    const [x1, y1] = vertices[i]!;
    const [x2, y2] = vertices[(i + 1) % vertices.length]!;
    if (distToSegment(px, py, x1, y1, x2, y2) < threshold) return true;
  }
  return false;
}

// ─── Shape hit testing ───────────────────────────────────────────────────────

/**
 * Test if the world-space point (wx, wy) hits a shape.
 * Returns true if the point is on the border or inside the shape.
 *
 * @param threshold  hit tolerance in world units (scaled by caller if needed)
 */
export function hitTestShape(
  shape: Shape,
  wx: number,
  wy: number,
  threshold: number = HIT_THRESHOLD
): boolean {
  switch (shape.type) {
    case "rectangle": {
      const { minX, minY, maxX, maxY } = getBounds(shape);
      // Inside the rect
      if (wx >= minX && wx <= maxX && wy >= minY && wy <= maxY) return true;
      // Near any edge
      const vertices: [number, number][] = [
        [minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY],
      ];
      return nearPolygonBorder(wx, wy, vertices, threshold);
    }

    case "diamond": {
      const { minX, minY, maxX, maxY } = getBounds(shape);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const vertices: [number, number][] = [
        [cx, minY], [maxX, cy], [cx, maxY], [minX, cy],
      ];
      if (pointInPolygon(wx, wy, vertices)) return true;
      return nearPolygonBorder(wx, wy, vertices, threshold);
    }

    case "circle": {
      const { minX, minY, maxX, maxY } = getBounds(shape);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = Math.abs(maxX - minX) / 2;
      const ry = Math.abs(maxY - minY) / 2;
      if (rx === 0 || ry === 0) return false;
      // Normalised distance from center
      const ndx = (wx - cx) / rx;
      const ndy = (wy - cy) / ry;
      const nd = ndx * ndx + ndy * ndy;
      // Inside or near border
      const innerThreshold = threshold / Math.max(rx, ry);
      return nd <= (1 + innerThreshold) * (1 + innerThreshold);
    }

    case "line":
    case "arrow": {
      const pts = shape.points && shape.points.length >= 2
        ? shape.points
        : [[shape.x1, shape.y1], [shape.x2, shape.y2]] as [number, number][];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[i + 1]!;
        if (distToSegment(wx, wy, ax, ay, bx, by) < threshold) return true;
      }
      return false;
    }

    default:
      return false;
  }
}

// ─── Handle hit testing ──────────────────────────────────────────────────────

/** Get the 8 handle positions for a bounding-box shape (world coords) */
export function getHandlePositions(shape: Shape): Record<HandleId, [number, number]> {
  const { minX, minY, maxX, maxY } = getBounds(shape);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    nw: [minX, minY],
    n:  [cx,   minY],
    ne: [maxX, minY],
    e:  [maxX, cy  ],
    se: [maxX, maxY],
    s:  [cx,   maxY],
    sw: [minX, maxY],
    w:  [minX, cy  ],
    rotate: [cx, minY - 20],
  };
}

/**
 * Check if point (wx, wy) hits a resize handle on the given shape.
 * Returns the HandleId if hit, null otherwise.
 *
 * @param handleWorldSize  handle radius in world units
 */
export function hitTestHandle(
  shape: Shape,
  wx: number,
  wy: number,
  handleWorldSize: number = HANDLE_SIZE
): HandleId | null {
  // For lines/arrows we don't use bounding-box handles
  if (shape.type === "line" || shape.type === "arrow") return null;

  const handles = getHandlePositions(shape);
  const allIds: HandleId[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  for (const id of allIds) {
    const [hx, hy] = handles[id];
    if (Math.abs(wx - hx) <= handleWorldSize && Math.abs(wy - hy) <= handleWorldSize) {
      return id;
    }
  }
  return null;
}

/**
 * For a line/arrow, test if point (wx, wy) hits a point node.
 * Returns the point index if hit, -1 otherwise.
 */
export function hitTestLinePoint(
  shape: Shape,
  wx: number,
  wy: number,
  nodeWorldSize: number = HANDLE_SIZE
): number {
  if (shape.type !== "line" && shape.type !== "arrow") return -1;
  const pts = shape.points ?? [[shape.x1, shape.y1], [shape.x2, shape.y2]] as [number, number][];
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i]!;
    if (Math.abs(wx - px) <= nodeWorldSize && Math.abs(wy - py) <= nodeWorldSize) {
      return i;
    }
  }
  return -1;
}

/**
 * For a line/arrow, test if point (wx, wy) hits a midpoint (between two nodes).
 * Returns the segment index (insert after this index) if hit, -1 otherwise.
 */
export function hitTestLineMidpoint(
  shape: Shape,
  wx: number,
  wy: number,
  nodeWorldSize: number = HANDLE_SIZE
): number {
  if (shape.type !== "line" && shape.type !== "arrow") return -1;
  const pts = shape.points ?? [[shape.x1, shape.y1], [shape.x2, shape.y2]] as [number, number][];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[i + 1]!;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    if (Math.abs(wx - mx) <= nodeWorldSize && Math.abs(wy - my) <= nodeWorldSize) {
      return i;
    }
  }
  return -1;
}

/** Get the cursor style for a given handle */
export function handleCursor(handle: HandleId): string {
  switch (handle) {
    case "nw": case "se": return "nwse-resize";
    case "ne": case "sw": return "nesw-resize";
    case "n":  case "s":  return "ns-resize";
    case "e":  case "w":  return "ew-resize";
    case "rotate": return "grab";
    default: return "default";
  }
}
