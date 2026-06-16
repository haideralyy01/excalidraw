// ─── Camera / Viewport Utilities ─────────────────────────────────────────────
// All shapes are stored in "world" coordinates. The camera defines how the
// world maps onto the screen via a scroll offset + zoom scale.

export interface Camera {
  scrollX: number; // pan offset in world units (positive = world shifted right)
  scrollY: number;
  zoom: number; // percentage, e.g. 100 = 1×
}

/** Zoom as a multiplier (100 → 1, 200 → 2, 50 → 0.5) */
export function zoomScale(cam: Camera): number {
  return cam.zoom / 100;
}

/** Convert screen pixel coordinates to world coordinates */
export function screenToWorld(
  sx: number,
  sy: number,
  cam: Camera
): [number, number] {
  const s = zoomScale(cam);
  return [sx / s - cam.scrollX, sy / s - cam.scrollY];
}

/** Convert world coordinates to screen pixel coordinates */
export function worldToScreen(
  wx: number,
  wy: number,
  cam: Camera
): [number, number] {
  const s = zoomScale(cam);
  return [(wx + cam.scrollX) * s, (wy + cam.scrollY) * s];
}

/**
 * Apply the camera transform to a canvas 2D context.
 * After calling this, drawing at world coords will appear at the correct
 * screen position. Call ctx.save() before and ctx.restore() after.
 */
export function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  dpr: number
): void {
  const s = zoomScale(cam);
  // Reset to identity scaled by DPR, then apply camera
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * cam.scrollX * s, dpr * cam.scrollY * s);
}

/**
 * Compute new scroll values so that zooming happens towards a focal point
 * (typically the cursor position).
 *
 * @param focalScreenX  screen x of the zoom focus (e.g. cursor)
 * @param focalScreenY  screen y of the zoom focus
 * @param oldCam        camera state before zoom
 * @param newZoom       the new zoom percentage
 * @returns updated scrollX and scrollY
 */
export function zoomTowardPoint(
  focalScreenX: number,
  focalScreenY: number,
  oldCam: Camera,
  newZoom: number
): { scrollX: number; scrollY: number } {
  const oldScale = zoomScale(oldCam);
  const newScale = newZoom / 100;

  // The world point under the cursor before zoom
  const worldX = focalScreenX / oldScale - oldCam.scrollX;
  const worldY = focalScreenY / oldScale - oldCam.scrollY;

  // After zoom, we want the same world point to be at the same screen position:
  //   focalScreenX = (worldX + newScrollX) * newScale
  //   newScrollX = focalScreenX / newScale - worldX
  const scrollX = focalScreenX / newScale - worldX;
  const scrollY = focalScreenY / newScale - worldY;

  return { scrollX, scrollY };
}
