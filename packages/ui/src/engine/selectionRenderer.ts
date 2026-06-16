// ─── Selection UI Renderer ───────────────────────────────────────────────────
// Draws bounding boxes, handles, and line-node circles on the overlay canvas.
// All input shapes are in world coords; the camera transforms them to screen.

import type { Shape } from "../types";
import type { Camera } from "./camera";
import { worldToScreen } from "./camera";
import { getBounds, getHandlePositions } from "./hitTest";

const SELECTION_COLOR = "#4f46e5"; // indigo-600
const HANDLE_FILL = "#ffffff";
const HANDLE_SIZE = 6; // px on screen (half-width)
const MIDPOINT_SIZE = 4;
const ROTATE_HANDLE_RADIUS = 5;
const ROTATE_HANDLE_GAP = 20; // world units above top edge

/**
 * Draw the selection UI for a shape on the given canvas context.
 * The context should already have DPR scaling applied (ctx.setTransform(dpr,...))
 * but NOT the camera transform — we apply screen coords ourselves.
 */
export function drawSelectionUI(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  cam: Camera
): void {
  if (shape.type === "line" || shape.type === "arrow") {
    drawLineSelectionUI(ctx, shape, cam);
  } else {
    drawBoxSelectionUI(ctx, shape, cam);
  }
}

// ─── Bounding Box Selection (rect, diamond, circle) ─────────────────────────

function drawBoxSelectionUI(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  cam: Camera
): void {
  const { minX, minY, maxX, maxY } = getBounds(shape);

  const [sx1, sy1] = worldToScreen(minX, minY, cam);
  const [sx2, sy2] = worldToScreen(maxX, maxY, cam);
  const w = sx2 - sx1;
  const h = sy2 - sy1;

  // ── Dashed bounding box ──
  ctx.save();
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(sx1, sy1, w, h);
  ctx.setLineDash([]);
  ctx.restore();

  // ── 8 resize handles ──
  const handles = getHandlePositions(shape);
  const handleIds = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
  for (const id of handleIds) {
    const [wx, wy] = handles[id];
    const [hx, hy] = worldToScreen(wx, wy, cam);
    drawHandle(ctx, hx, hy, HANDLE_SIZE);
  }

  // ── Rotation handle ──
  const [rwx, rwy] = handles.rotate;
  const [rx, ry] = worldToScreen(rwx, rwy, cam);
  // Line from top-center to rotation handle
  const [tcx, tcy] = worldToScreen((minX + maxX) / 2, minY, cam);
  ctx.save();
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tcx, tcy);
  ctx.lineTo(rx, ry);
  ctx.stroke();
  // Rotation circle
  ctx.beginPath();
  ctx.arc(rx, ry, ROTATE_HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = HANDLE_FILL;
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ─── Line / Arrow Selection (point nodes + midpoints) ───────────────────────

function drawLineSelectionUI(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  cam: Camera
): void {
  const pts = shape.points && shape.points.length >= 2
    ? shape.points
    : [[shape.x1, shape.y1], [shape.x2, shape.y2]] as [number, number][];

  // ── Thin connecting line (visual guide) ──
  ctx.save();
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  const [firstX, firstY] = worldToScreen(pts[0]![0], pts[0]![1], cam);
  ctx.moveTo(firstX, firstY);
  for (let i = 1; i < pts.length; i++) {
    const [sx, sy] = worldToScreen(pts[i]![0], pts[i]![1], cam);
    ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── Point nodes (filled circles at each vertex) ──
  for (let i = 0; i < pts.length; i++) {
    const [sx, sy] = worldToScreen(pts[i]![0], pts[i]![1], cam);
    drawHandle(ctx, sx, sy, HANDLE_SIZE);
  }

  // ── Midpoint nodes (smaller, semi-transparent, between consecutive points) ──
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[i + 1]!;
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const [sx, sy] = worldToScreen(mx, my, cam);
    drawMidpointHandle(ctx, sx, sy, MIDPOINT_SIZE);
  }
}

// ─── Handle drawing primitives ───────────────────────────────────────────────

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.fillStyle = HANDLE_FILL;
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

function drawMidpointHandle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.fillStyle = "rgba(79, 70, 229, 0.3)";
  ctx.strokeStyle = SELECTION_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
