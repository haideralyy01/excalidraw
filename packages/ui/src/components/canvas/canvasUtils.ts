import type { Shape, HandleId } from "../../types";

/** Resize a shape from a specific handle by delta amounts */
export function resizeShape(orig: Shape, handle: HandleId, dx: number, dy: number): Shape {
  let { x1, y1, x2, y2 } = orig;

  switch (handle) {
    case "nw": x1 += dx; y1 += dy; break;
    case "n":  y1 += dy; break;
    case "ne": x2 += dx; y1 += dy; break;
    case "e":  x2 += dx; break;
    case "se": x2 += dx; y2 += dy; break;
    case "s":  y2 += dy; break;
    case "sw": x1 += dx; y2 += dy; break;
    case "w":  x1 += dx; break;
    case "rotate": break; // not implemented yet
  }

  return { ...orig, x1, y1, x2, y2 };
}

/** Recompute x1/y1/x2/y2 from a shape's points array */
export function updateBoundsFromPoints(shape: Shape): void {
  if (!shape.points || shape.points.length < 2) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [px, py] of shape.points) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  shape.x1 = minX;
  shape.y1 = minY;
  shape.x2 = maxX;
  shape.y2 = maxY;
}
