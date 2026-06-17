"use client";

import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import rough from "roughjs";
import type { Shape, ShapeType, HandleId } from "../types";
import { renderShape } from "../engine/shapeRenderer";
import {
  type Camera,
  screenToWorld,
  worldToScreen,
  applyCameraTransform,
  zoomTowardPoint,
  zoomScale,
} from "../engine/camera";
import {
  hitTestShape,
  hitTestHandle,
  hitTestLinePoint,
  hitTestLineMidpoint,
  handleCursor,
  getBounds,
} from "../engine/hitTest";
import { drawSelectionUI } from "../engine/selectionRenderer";

// ── Shape tools that support click-drag drawing ──
const SHAPE_TOOLS = new Set<string>([
  "rectangle",
  "diamond",
  "circle",
  "line",
  "arrow",
]);

// ── Default rough.js options for new shapes ──
const DEFAULT_SHAPE_OPTIONS: Shape["options"] = {
  stroke: "#ffffff",
  strokeWidth: 2,
  roughness: 1.5,
  fill: "transparent",
  fillStyle: "hachure",
};

// ── Custom eraser cursor: 12px hollow circle ──
const ERASER_CURSOR_SIZE = 12;
const ERASER_CURSOR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ERASER_CURSOR_SIZE}" height="${ERASER_CURSOR_SIZE}" viewBox="0 0 ${ERASER_CURSOR_SIZE} ${ERASER_CURSOR_SIZE}">
  <circle cx="${ERASER_CURSOR_SIZE / 2}" cy="${ERASER_CURSOR_SIZE / 2}" r="${ERASER_CURSOR_SIZE / 2 - 1}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
</svg>`;
const ERASER_CURSOR_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(ERASER_CURSOR_SVG.trim())}") ${ERASER_CURSOR_SIZE / 2} ${ERASER_CURSOR_SIZE / 2}, auto`;

// ── Base cursor map per tool ──
const CURSOR_MAP: Record<string, string> = {
  hand: "grab",
  cursor: "default",
  rectangle: "crosshair",
  diamond: "crosshair",
  circle: "crosshair",
  arrow: "crosshair",
  line: "crosshair",
  pen: "crosshair",
  text: "text",
  image: "crosshair",
  eraser: ERASER_CURSOR_DATA_URI,
  lock: "default",
  more: "default",
};

// ── Eraser wavy trail ──
interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

const TRAIL_MAX_AGE = 600;
const WAVE_AMPLITUDE = 6;
const WAVE_FREQUENCY = 0.12;

// ── Text tool constants ──
const TEXT_FONT_SIZE = 20;
const TEXT_FONT_FAMILY = "Virgil, Segoe UI Emoji, Apple Color Emoji, sans-serif";
const TEXT_LINE_HEIGHT = 1.35;
const TEXT_MIN_WIDTH = 100; // minimum textarea width in px
const TEXT_PADDING = 4;     // padding around text

// ── Interaction modes ──
type InteractionMode =
  | { type: "none" }
  | { type: "drawing"; startWX: number; startWY: number; seed: number }
  | { type: "panning"; lastSX: number; lastSY: number }
  | { type: "moving"; shapeId: string; startWX: number; startWY: number; origShape: Shape }
  | { type: "resizing"; shapeId: string; handle: HandleId; startWX: number; startWY: number; origShape: Shape }
  | { type: "dragging-point"; shapeId: string; pointIndex: number; startWX: number; startWY: number; origPoints: [number, number][] }
  | { type: "erasing"; hasErased: boolean }
  | { type: "editing-text" };

// ── Props ──
interface CanvasProps {
  backgroundColor?: string;
  showGrid?: boolean;
  gridColor?: string;
  gridSpacing?: number;
  className?: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  activeTool?: string;
  onShapesChange?: (shapes: Shape[]) => void;
  /** Fires when the local user draws a new shape */
  onShapeAdded?: (shape: Shape) => void;
  /** Fires when the local user moves/resizes a shape */
  onShapeUpdated?: (shape: Shape) => void;
  /** Fires when the local user deletes/erases a shape */
  onShapeDeleted?: (shapeId: string) => void;
}

/** Methods exposed via ref for external shape control (WS sync) */
export interface CanvasHandle {
  /** Add a shape received from another user (no undo push) */
  addRemoteShape: (shape: Shape) => void;
  /** Update a shape received from another user (move/resize) */
  updateRemoteShape: (shape: Shape) => void;
  /** Delete a shape received from another user */
  deleteRemoteShape: (shapeId: string) => void;
  /** Bulk-load shapes (e.g. from DB on room join) */
  loadShapes: (shapes: Shape[]) => void;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas({
  backgroundColor = "#121212",
  showGrid = true,
  gridColor = "rgba(255, 255, 255, 0.06)",
  gridSpacing = 20,
  className = "",
  zoom = 100,
  onZoomChange,
  activeTool = "cursor",
  onShapesChange,
  onShapeAdded,
  onShapeUpdated,
  onShapeDeleted,
}, ref) {
  // ── Canvas refs ──
  const canvasRef = useRef<HTMLCanvasElement>(null);       // z:0 — background grid
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);    // z:1 — committed shapes
  const overlayRef = useRef<HTMLCanvasElement>(null);       // z:2 — preview + selection UI + eraser trail

  // ── Eraser trail refs ──
  const trailRef = useRef<TrailPoint[]>([]);
  const animFrameRef = useRef<number>(0);

  // ── Camera state (pan targets) ──
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // ── Visual (interpolated) camera state ──
  const [visualZoom, setVisualZoom] = useState(zoom);
  const [visualScrollX, setVisualScrollX] = useState(0);
  const [visualScrollY, setVisualScrollY] = useState(0);

  // Keep camera refs in sync
  const targetCameraRef = useRef<Camera>({ scrollX, scrollY, zoom });
  targetCameraRef.current = { scrollX, scrollY, zoom };

  const visualCameraRef = useRef<Camera>({ scrollX: visualScrollX, scrollY: visualScrollY, zoom: visualZoom });
  visualCameraRef.current = { scrollX: visualScrollX, scrollY: visualScrollY, zoom: visualZoom };

  const prevZoomRef = useRef(zoom);

  // ── Shape state ──
  const [shapes, setShapes] = useState<Shape[]>([]);
  const shapesRef = useRef<Shape[]>([]);
  shapesRef.current = shapes;
  const undoStackRef = useRef<Shape[][]>([]);
  const redoStackRef = useRef<Shape[][]>([]);

  // ── Expose imperative methods for remote shape sync ──
  useImperativeHandle(ref, () => ({
    addRemoteShape(shape: Shape) {
      setShapes(prev => {
        if (prev.some(s => s.id === shape.id)) return prev; // dedupe
        return [...prev, shape];
      });
    },
    updateRemoteShape(shape: Shape) {
      setShapes(prev => {
        const idx = prev.findIndex(s => s.id === shape.id);
        if (idx >= 0) {
          // Update in place
          const next = [...prev];
          next[idx] = shape;
          return next;
        }
        // Upsert: shape doesn't exist yet (e.g. live text broadcast arrived before final add)
        return [...prev, shape];
      });
    },
    deleteRemoteShape(shapeId: string) {
      setShapes(prev => prev.filter(s => s.id !== shapeId));
    },
    loadShapes(newShapes: Shape[]) {
      setShapes(newShapes);
      undoStackRef.current = [];
      redoStackRef.current = [];
    },
  }), []);

  // ── Selection state ──
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // ── Interaction mode ref (instant access in event handlers) ──
  const modeRef = useRef<InteractionMode>({ type: "none" });

  // ── Dynamic cursor ──
  const [dynamicCursor, setDynamicCursor] = useState<string | null>(null);

  // ── Hand tool grab state ──
  const [isGrabbing, setIsGrabbing] = useState(false);

  // ── Text editing state ──
  const [textEditing, setTextEditing] = useState<{
    worldX: number;
    worldY: number;
    text: string;
    editingShapeId: string | null;  // null = creating new, string = editing existing
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textBroadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textShapeIdRef = useRef<string | null>(null);  // tracks the in-progress shape id for live broadcast
  const textReadyToCommitRef = useRef(false); // guards against premature onBlur

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  const cam = (): Camera => visualCameraRef.current;
  const targetCam = (): Camera => targetCameraRef.current;

  // ── Track the focal point in world coordinates for smooth, wobble-free zooming ──
  const zoomFocalRef = useRef<{ cx: number; cy: number; wx: number; wy: number } | null>(null);

  // ── Effect to detect external zoom changes (e.g. from ZoomControls UI) and focus zoom on screen center ──
  useEffect(() => {
    if (zoom !== prevZoomRef.current) {
      const oldZoom = prevZoomRef.current;
      prevZoomRef.current = zoom;

      // If zoomFocalRef.current is null, the zoom change is external (from navbar zoom buttons)
      if (!zoomFocalRef.current) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const current = visualCameraRef.current;
        const scale = current.zoom / 100;
        const wx = cx / scale - current.scrollX;
        const wy = cy / scale - current.scrollY;
        zoomFocalRef.current = { cx, cy, wx, wy };

        const newScale = zoom / 100;
        setScrollX(cx / newScale - wx);
        setScrollY(cy / newScale - wy);
      }
    }
  }, [zoom]);

  // ── Camera animation loop for smooth zoom and pan ──
  useEffect(() => {
    let active = true;

    const animate = () => {
      if (!active) return;

      const current = visualCameraRef.current;
      const targetZoom = zoom;
      const targetX = scrollX;
      const targetY = scrollY;

      const diffZ = targetZoom - current.zoom;
      const thresholdZ = 0.01;

      const focal = zoomFocalRef.current;

      // If we are currently zooming (and have a focal point)
      if (focal && Math.abs(diffZ) > thresholdZ) {
        const nextZ = current.zoom + diffZ * 0.25;
        const nextScale = nextZ / 100;

        // Calculate scroll offsets to keep the focal point perfectly locked at the same screen position
        const nextX = focal.cx / nextScale - focal.wx;
        const nextY = focal.cy / nextScale - focal.wy;

        setVisualZoom(nextZ);
        setVisualScrollX(nextX);
        setVisualScrollY(nextY);

        requestAnimationFrame(animate);
      } else {
        // Zoom has finished, or we are not zooming.
        // If we were zooming, snap everything to target zoom and target scroll to ensure no wobbly sliding at the end!
        if (focal) {
          setVisualZoom(targetZoom);
          setVisualScrollX(targetX);
          setVisualScrollY(targetY);
          zoomFocalRef.current = null;
        } else {
          // Plain panning animation (no zoom happening)
          const diffX = targetX - current.scrollX;
          const diffY = targetY - current.scrollY;
          const thresholdP = 0.1;

          const needsPanAnim = Math.abs(diffX) > thresholdP || Math.abs(diffY) > thresholdP;

          if (needsPanAnim) {
            const nextX = current.scrollX + diffX * 0.25;
            const nextY = current.scrollY + diffY * 0.25;

            setVisualZoom(targetZoom);
            setVisualScrollX(nextX);
            setVisualScrollY(nextY);

            requestAnimationFrame(animate);
          } else {
            // Snap directly to final targets
            setVisualZoom(targetZoom);
            setVisualScrollX(targetX);
            setVisualScrollY(targetY);
          }
        }
      }
    };

    animate();

    return () => {
      active = false;
    };
  }, [zoom, scrollX, scrollY]);

  /** Push current shapes to undo stack and update */
  const commitShapes = useCallback((next: Shape[]) => {
    undoStackRef.current.push([...shapesRef.current]);
    redoStackRef.current = [];
    setShapes(next);
    onShapesChange?.(next);
  }, [onShapesChange]);

  /** Update a single shape by id (no undo push — used during drag) */
  const updateShapeLive = useCallback((id: string, updater: (s: Shape) => Shape) => {
    setShapes(prev => prev.map(s => s.id === id ? updater(s) : s));
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // BACKGROUND GRID (z:0) — now respects pan
  // ════════════════════════════════════════════════════════════════════════════

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const scale = visualZoom / 100;
    const scaledSpacing = gridSpacing * scale;

    if (showGrid && scaledSpacing > 4) {
      ctx.fillStyle = gridColor;
      const dotRadius = Math.max(0.5, 1 * scale);

      // Offset grid by scroll so dots move with pan
      const offsetX = (visualScrollX * scale) % scaledSpacing;
      const offsetY = (visualScrollY * scale) % scaledSpacing;

      for (let x = offsetX; x < width; x += scaledSpacing) {
        for (let y = offsetY; y < height; y += scaledSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [backgroundColor, showGrid, gridColor, gridSpacing, visualZoom, visualScrollX, visualScrollY]);

  useEffect(() => {
    drawGrid();
    const handleResize = () => drawGrid();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawGrid]);

  // ════════════════════════════════════════════════════════════════════════════
  // DRAWING CANVAS (z:1) — resize + re-render with camera transform
  // ════════════════════════════════════════════════════════════════════════════

  const resizeDrawCanvas = useCallback(() => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    drawCanvas.width = width * dpr;
    drawCanvas.height = height * dpr;
    drawCanvas.style.width = `${width}px`;
    drawCanvas.style.height = `${height}px`;
  }, []);

  /** Clear drawing canvas and re-render all shapes with camera transform */
  const redrawAllShapes = useCallback((shapesToDraw: Shape[]) => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return;
    const ctx = drawCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = drawCanvas.width / dpr;
    const height = drawCanvas.height / dpr;

    // Clear with identity transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Apply camera transform so rough.js draws in world coords
    const c = cam();
    applyCameraTransform(ctx, c, dpr);

    const rc = rough.canvas(drawCanvas);
    for (const shape of shapesToDraw) {
      renderShape(rc, shape);
    }

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resizeDrawCanvas();
    const handleResize = () => {
      resizeDrawCanvas();
      redrawAllShapes(shapes);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeDrawCanvas, redrawAllShapes, shapes]);

  // Re-render shapes whenever they, visualZoom, or visualScroll change
  useEffect(() => {
    redrawAllShapes(shapes);
  }, [shapes, redrawAllShapes, visualZoom, visualScrollX, visualScrollY]);

  // ════════════════════════════════════════════════════════════════════════════
  // OVERLAY CANVAS (z:2) — resize
  // ════════════════════════════════════════════════════════════════════════════

  const resizeOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    overlay.width = width * dpr;
    overlay.height = height * dpr;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    resizeOverlay();
    window.addEventListener("resize", resizeOverlay);
    return () => window.removeEventListener("resize", resizeOverlay);
  }, [resizeOverlay]);

  // ════════════════════════════════════════════════════════════════════════════
  // SELECTION UI — redraw on overlay whenever selection/shapes/camera change
  // ════════════════════════════════════════════════════════════════════════════

  const drawSelectionOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = overlay.width / dpr;
    const height = overlay.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!selectedShapeId) return;
    const shape = shapesRef.current.find(s => s.id === selectedShapeId);
    if (!shape) return;

    drawSelectionUI(ctx, shape, cam());
  }, [selectedShapeId]);

  useEffect(() => {
    // Only draw selection UI when not in eraser mode and not mid-drawing
    if (activeTool === "eraser") return;
    if (modeRef.current.type === "drawing") return;
    drawSelectionOverlay();
  }, [selectedShapeId, shapes, visualZoom, visualScrollX, visualScrollY, drawSelectionOverlay, activeTool]);

  // ════════════════════════════════════════════════════════════════════════════
  // SHAPE DRAWING — mouse handlers
  // ════════════════════════════════════════════════════════════════════════════

  const drawPreview = useCallback((wx1: number, wy1: number, wx2: number, wy2: number, seed: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = overlay.width / dpr;
    const height = overlay.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Apply camera so the preview shape aligns with committed shapes
    const c = cam();
    applyCameraTransform(ctx, c, dpr);

    const previewShape: Shape = {
      id: "preview",
      type: activeTool as ShapeType,
      x1: wx1, y1: wy1,
      x2: wx2, y2: wy2,
      points: (activeTool === "line" || activeTool === "arrow")
        ? [[wx1, wy1], [wx2, wy2]]
        : undefined,
      options: { ...DEFAULT_SHAPE_OPTIONS, seed },
    };

    const rc = rough.canvas(overlay);
    renderShape(rc, previewShape);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [activeTool]);

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // UNIFIED MOUSE HANDLER — handles drawing, panning, selecting, moving, resizing
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    // ── mousedown ──
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target !== overlay) return;

      const c = cam();
      const [wx, wy] = screenToWorld(e.clientX, e.clientY, c);
      const scale = zoomScale(c);
      const hitThreshold = 8 / scale; // constant screen-px threshold

      // ── HAND TOOL or middle-mouse: start panning ──
      if (activeTool === "hand" || e.button === 1) {
        modeRef.current = { type: "panning", lastSX: e.clientX, lastSY: e.clientY };
        setIsGrabbing(true);
        e.preventDefault();
        return;
      }

      // ── SHAPE TOOL: start drawing ──
      if (SHAPE_TOOLS.has(activeTool)) {
        const seed = Math.floor(Math.random() * 2147483647);
        modeRef.current = { type: "drawing", startWX: wx, startWY: wy, seed };
        return;
      }

      // ── ERASER TOOL: start erasing ──
      if (activeTool === "eraser") {
        undoStackRef.current.push([...shapesRef.current]);
        redoStackRef.current = [];
        modeRef.current = { type: "erasing", hasErased: false };

        trailRef.current = [{ x: e.clientX, y: e.clientY, time: performance.now() }];
        if (!animFrameRef.current) {
          animFrameRef.current = requestAnimationFrame(animateTrail);
        }

        const remaining = shapesRef.current.filter(s => !hitTestShape(s, wx, wy, hitThreshold));
        if (remaining.length !== shapesRef.current.length) {
          // Find erased shapes and notify
          const erasedIds = shapesRef.current.filter(s => hitTestShape(s, wx, wy, hitThreshold)).map(s => s.id);
          setShapes(remaining);
          modeRef.current = { type: "erasing", hasErased: true };
          erasedIds.forEach(id => onShapeDeleted?.(id));
          if (selectedShapeId && !remaining.some(s => s.id === selectedShapeId)) {
            setSelectedShapeId(null);
          }
        }
        return;
      }

      // ── TEXT TOOL: start text editing ──
      if (activeTool === "text") {
        // If already editing text, commit the current one first
        if (textEditing) {
          commitTextShape();
          return;
        }
        textReadyToCommitRef.current = false;
        setTextEditing({ worldX: wx, worldY: wy, text: "", editingShapeId: null });
        textShapeIdRef.current = crypto.randomUUID();
        modeRef.current = { type: "editing-text" };
        return;
      }

      // ── CURSOR TOOL: selection / move / resize / node drag ──
      if (activeTool === "cursor") {
        // 1. If we have a selected shape, check handles first
        if (selectedShapeId) {
          const selShape = shapesRef.current.find(s => s.id === selectedShapeId);
          if (selShape) {
            // Check line/arrow point nodes
            if (selShape.type === "line" || selShape.type === "arrow") {
              const ptIdx = hitTestLinePoint(selShape, wx, wy, hitThreshold);
              if (ptIdx >= 0) {
                const pts = selShape.points ?? [[selShape.x1, selShape.y1], [selShape.x2, selShape.y2]] as [number, number][];
                modeRef.current = {
                  type: "dragging-point",
                  shapeId: selShape.id,
                  pointIndex: ptIdx,
                  startWX: wx,
                  startWY: wy,
                  origPoints: pts.map(p => [...p]) as [number, number][],
                };
                return;
              }
              // Check midpoint nodes (click to insert)
              const midIdx = hitTestLineMidpoint(selShape, wx, wy, hitThreshold);
              if (midIdx >= 0) {
                const pts = selShape.points ?? [[selShape.x1, selShape.y1], [selShape.x2, selShape.y2]] as [number, number][];
                const [ax, ay] = pts[midIdx]!;
                const [bx, by] = pts[midIdx + 1]!;
                const mx = (ax + bx) / 2;
                const my = (ay + by) / 2;
                const newPts = [...pts.slice(0, midIdx + 1), [mx, my] as [number, number], ...pts.slice(midIdx + 1)];
                // Insert the midpoint and immediately start dragging it
                const updatedShape = { ...selShape, points: newPts };
                updateBoundsFromPoints(updatedShape);
                setShapes(prev => prev.map(s => s.id === selShape.id ? updatedShape : s));
                modeRef.current = {
                  type: "dragging-point",
                  shapeId: selShape.id,
                  pointIndex: midIdx + 1,
                  startWX: wx,
                  startWY: wy,
                  origPoints: newPts.map(p => [...p]) as [number, number][],
                };
                return;
              }
            }

            // Check bounding-box handles (rect, diamond, circle)
            const handle = hitTestHandle(selShape, wx, wy, hitThreshold);
            if (handle) {
              modeRef.current = {
                type: "resizing",
                shapeId: selShape.id,
                handle,
                startWX: wx,
                startWY: wy,
                origShape: { ...selShape },
              };
              return;
            }
          }
        }

        // 2. Hit-test all shapes (topmost first)
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
          const s = shapesRef.current[i]!;
          if (hitTestShape(s, wx, wy, hitThreshold)) {
            setSelectedShapeId(s.id);
            modeRef.current = {
              type: "moving",
              shapeId: s.id,
              startWX: wx,
              startWY: wy,
              origShape: { ...s, points: s.points ? s.points.map(p => [...p] as [number, number]) : undefined },
            };
            return;
          }
        }

        // 3. Clicked empty space → deselect
        setSelectedShapeId(null);
        modeRef.current = { type: "none" };
      }
    };

    // ── mousemove ──
    const handleMouseMove = (e: MouseEvent) => {
      const c = cam();
      const [wx, wy] = screenToWorld(e.clientX, e.clientY, c);
      const scale = zoomScale(c);
      const mode = modeRef.current;

      // ── Active interaction ──
      switch (mode.type) {
        case "drawing": {
          drawPreview(mode.startWX, mode.startWY, wx, wy, mode.seed);
          return;
        }
        case "panning": {
          const dx = e.clientX - mode.lastSX;
          const dy = e.clientY - mode.lastSY;
          mode.lastSX = e.clientX;
          mode.lastSY = e.clientY;
          const s = zoomScale(c);
          setScrollX(prev => prev + dx / s);
          setScrollY(prev => prev + dy / s);
          return;
        }
        case "moving": {
          const dx = wx - mode.startWX;
          const dy = wy - mode.startWY;
          const orig = mode.origShape;
          updateShapeLive(mode.shapeId, () => {
            const moved: Shape = {
              ...orig,
              x1: orig.x1 + dx,
              y1: orig.y1 + dy,
              x2: orig.x2 + dx,
              y2: orig.y2 + dy,
            };
            if (orig.points) {
              moved.points = orig.points.map(([px, py]) => [px + dx, py + dy] as [number, number]);
            }
            return moved;
          });
          return;
        }
        case "resizing": {
          const orig = mode.origShape;
          const dx = wx - mode.startWX;
          const dy = wy - mode.startWY;
          updateShapeLive(mode.shapeId, () => {
            return resizeShape(orig, mode.handle, dx, dy);
          });
          return;
        }
        case "dragging-point": {
          const dx = wx - mode.startWX;
          const dy = wy - mode.startWY;
          updateShapeLive(mode.shapeId, (s) => {
            const newPts = mode.origPoints.map((p, i) =>
              i === mode.pointIndex ? [p[0] + dx, p[1] + dy] as [number, number] : [...p] as [number, number]
            );
            const updated = { ...s, points: newPts };
            updateBoundsFromPoints(updated);
            return updated;
          });
          return;
        }
        case "erasing": {
          trailRef.current.push({ x: e.clientX, y: e.clientY, time: performance.now() });
          if (trailRef.current.length > 200) {
            trailRef.current = trailRef.current.slice(-150);
          }
          if (!animFrameRef.current) {
            animFrameRef.current = requestAnimationFrame(animateTrail);
          }

          const hitThreshold = 8 / scale;
          const remaining = shapesRef.current.filter(s => !hitTestShape(s, wx, wy, hitThreshold));
          if (remaining.length !== shapesRef.current.length) {
            const erasedIds = shapesRef.current.filter(s => hitTestShape(s, wx, wy, hitThreshold)).map(s => s.id);
            setShapes(remaining);
            modeRef.current = { type: "erasing", hasErased: true };
            erasedIds.forEach(id => onShapeDeleted?.(id));
            if (selectedShapeId && !remaining.some(s => s.id === selectedShapeId)) {
              setSelectedShapeId(null);
            }
          }
          return;
        }
      }

      // ── Passive hover: update cursor ──
      if (activeTool === "cursor") {
        const hitThreshold = 8 / scale;

        // Check handles on selected shape
        if (selectedShapeId) {
          const selShape = shapesRef.current.find(s => s.id === selectedShapeId);
          if (selShape) {
            if (selShape.type === "line" || selShape.type === "arrow") {
              const ptIdx = hitTestLinePoint(selShape, wx, wy, hitThreshold);
              if (ptIdx >= 0) { setDynamicCursor("grab"); return; }
              const midIdx = hitTestLineMidpoint(selShape, wx, wy, hitThreshold);
              if (midIdx >= 0) { setDynamicCursor("pointer"); return; }
            }
            const handle = hitTestHandle(selShape, wx, wy, hitThreshold);
            if (handle) { setDynamicCursor(handleCursor(handle)); return; }
          }
        }

        // Check if hovering over any shape
        for (let i = shapesRef.current.length - 1; i >= 0; i--) {
          if (hitTestShape(shapesRef.current[i]!, wx, wy, 8 / scale)) {
            setDynamicCursor("move");
            return;
          }
        }
        setDynamicCursor(null);
      }
    };

    // ── mouseup ──
    const handleMouseUp = (e: MouseEvent) => {
      const c = cam();
      const [wx, wy] = screenToWorld(e.clientX, e.clientY, c);
      const mode = modeRef.current;

      switch (mode.type) {
        case "drawing": {
          modeRef.current = { type: "none" };

          const dx = wx - mode.startWX;
          const dy = wy - mode.startWY;
          if (Math.abs(dx) < 3 / zoomScale(c) && Math.abs(dy) < 3 / zoomScale(c)) {
            clearOverlay();
            drawSelectionOverlay();
            return;
          }

          const newShape: Shape = {
            id: crypto.randomUUID(),
            type: activeTool as ShapeType,
            x1: mode.startWX,
            y1: mode.startWY,
            x2: wx,
            y2: wy,
            points: (activeTool === "line" || activeTool === "arrow")
              ? [[mode.startWX, mode.startWY], [wx, wy]]
              : undefined,
            options: { ...DEFAULT_SHAPE_OPTIONS, seed: mode.seed },
          };

          commitShapes([...shapesRef.current, newShape]);
          onShapeAdded?.(newShape);
          clearOverlay();
          drawSelectionOverlay();
          return;
        }
        case "panning": {
          modeRef.current = { type: "none" };
          setIsGrabbing(false);
          return;
        }
        case "moving": {
          // Commit the moved shape and notify
          const movedShape = shapesRef.current.find(s => s.id === mode.shapeId);
          commitShapes([...shapesRef.current]);
          if (movedShape) onShapeUpdated?.(movedShape);
          modeRef.current = { type: "none" };
          return;
        }
        case "resizing": {
          const resizedShape = shapesRef.current.find(s => s.id === mode.shapeId);
          commitShapes([...shapesRef.current]);
          if (resizedShape) onShapeUpdated?.(resizedShape);
          modeRef.current = { type: "none" };
          return;
        }
        case "dragging-point": {
          const draggedShape = shapesRef.current.find(s => s.id === mode.shapeId);
          commitShapes([...shapesRef.current]);
          if (draggedShape) onShapeUpdated?.(draggedShape);
          modeRef.current = { type: "none" };
          return;
        }
        case "erasing": {
          const modeVal = mode;
          modeRef.current = { type: "none" };
          if (modeVal.hasErased) {
            onShapesChange?.(shapesRef.current);
          } else {
            undoStackRef.current.pop();
          }
          return;
        }
      }
    };

    // ── dblclick — edit existing text shapes ──
    const handleDblClick = (e: MouseEvent) => {
      if (activeTool !== "cursor") return;
      const c = cam();
      const [wx, wy] = screenToWorld(e.clientX, e.clientY, c);
      const scale = zoomScale(c);
      const hitThreshold = 8 / scale;

      // Find topmost text shape under cursor
      for (let i = shapesRef.current.length - 1; i >= 0; i--) {
        const s = shapesRef.current[i]!;
        if (s.type === "text" && hitTestShape(s, wx, wy, hitThreshold)) {
          // Open textarea for editing
          setTextEditing({
            worldX: s.x1,
            worldY: s.y1,
            text: s.text || "",
            editingShapeId: s.id,
          });
          textShapeIdRef.current = s.id;
          textReadyToCommitRef.current = false;
          modeRef.current = { type: "editing-text" };
          // Hide the canvas-rendered text while editing
          setShapes(prev => prev.filter(sh => sh.id !== s.id));
          setSelectedShapeId(null);
          return;
        }
      }
    };

    overlay.addEventListener("mousedown", handleMouseDown);
    overlay.addEventListener("dblclick", handleDblClick);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      overlay.removeEventListener("mousedown", handleMouseDown);
      overlay.removeEventListener("dblclick", handleDblClick);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeTool, selectedShapeId, drawPreview, clearOverlay, commitShapes, updateShapeLive, drawSelectionOverlay, textEditing]);

  // ════════════════════════════════════════════════════════════════════════════
  // UNDO / REDO
  // ════════════════════════════════════════════════════════════════════════════

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (prev === undefined) return;
    redoStackRef.current.push([...shapesRef.current]);
    setShapes(prev);
    onShapesChange?.(prev);
    setSelectedShapeId(null);
  }, [onShapesChange]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (next === undefined) return;
    undoStackRef.current.push([...shapesRef.current]);
    setShapes(next);
    onShapesChange?.(next);
    setSelectedShapeId(null);
  }, [onShapesChange]);

  // ════════════════════════════════════════════════════════════════════════════
  // KEYBOARD — undo/redo + delete
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ctrl+Z → undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      // Ctrl+Shift+Z → redo
      if (e.ctrlKey && e.key === "Z" && e.shiftKey) {
        e.preventDefault(); redo(); return;
      }
      // Ctrl+Y → redo
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault(); redo(); return;
      }
      // Delete / Backspace → delete selected shape
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShapeId) {
        e.preventDefault();
        commitShapes(shapesRef.current.filter(s => s.id !== selectedShapeId));
        onShapeDeleted?.(selectedShapeId);
        setSelectedShapeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedShapeId, commitShapes]);

  // ════════════════════════════════════════════════════════════════════════════
  // ZOOM — with scroll-toward-cursor
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        // Zoom toward cursor
        e.preventDefault();
        const direction = e.deltaY < 0 ? 1 : -1;
        const newZoom = Math.min(300, Math.max(10, zoom + direction * 10));
        if (onZoomChange) {
          const c = targetCam();
          const { scrollX: sx, scrollY: sy } = zoomTowardPoint(e.clientX, e.clientY, c, newZoom);
          
          // Set focal point at cursor based on visual camera to keep animation starting smoothly
          const vis = visualCameraRef.current;
          const visScale = vis.zoom / 100;
          const wx = e.clientX / visScale - vis.scrollX;
          const wy = e.clientY / visScale - vis.scrollY;
          zoomFocalRef.current = { cx: e.clientX, cy: e.clientY, wx, wy };

          setScrollX(sx);
          setScrollY(sy);
          onZoomChange(newZoom);
        }
      } else {
        // Plain scroll → pan
        e.preventDefault();
        const s = zoomScale(targetCam());
        setScrollX(prev => prev - e.deltaX / s);
        setScrollY(prev => prev - e.deltaY / s);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [zoom, onZoomChange]);

  // Zoom via Ctrl+Plus / Ctrl+Minus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "+" || e.key === "=" || e.key === "-")) {
        e.preventDefault();
        if (onZoomChange) {
          const direction = e.key === "-" ? -1 : 1;
          const newZoom = Math.min(300, Math.max(10, zoom + direction * 10));
          // Zoom toward center of screen
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          const c = targetCam();
          const { scrollX: sx, scrollY: sy } = zoomTowardPoint(cx, cy, c, newZoom);
          
          // Set focal point at screen center based on visual camera to keep animation starting smoothly
          const vis = visualCameraRef.current;
          const visScale = vis.zoom / 100;
          const wx = cx / visScale - vis.scrollX;
          const wy = cy / visScale - vis.scrollY;
          zoomFocalRef.current = { cx, cy, wx, wy };

          setScrollX(sx);
          setScrollY(sy);
          onZoomChange(newZoom);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom, onZoomChange]);

  // ════════════════════════════════════════════════════════════════════════════
  // ERASER WAVY TRAIL — unchanged from original
  // ════════════════════════════════════════════════════════════════════════════

  const animateTrail = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = overlay.width / dpr;
    const height = overlay.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const now = performance.now();
    trailRef.current = trailRef.current.filter((p) => now - p.time < TRAIL_MAX_AGE);
    const points = trailRef.current;

    if (points.length < 2) {
      if (points.length === 0) { animFrameRef.current = 0; return; }
      animFrameRef.current = requestAnimationFrame(animateTrail);
      return;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw a smooth, tapered, solid grey line (wide at cursor head, narrow at tail)
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const curr = points[i]!;
      const age = now - curr.time;
      const opacity = Math.max(0, 1 - age / TRAIL_MAX_AGE);
      if (opacity <= 0) continue;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      
      // Smooth grey (semi-transparent, matching the reference image)
      ctx.strokeStyle = `rgba(85, 85, 87, ${opacity * 0.7})`;
      ctx.lineWidth = 14 * opacity;
      ctx.stroke();
    }

    if (trailRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(animateTrail);
    } else {
      animFrameRef.current = 0;
      ctx.clearRect(0, 0, width, height);
    }
  }, []);

  useEffect(() => {
    if (activeTool !== "eraser") {
      trailRef.current = [];
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      clearOverlay();
    }
  }, [activeTool, clearOverlay]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // TEXT EDITING — commit, input handler, auto-focus
  // ════════════════════════════════════════════════════════════════════════════

  /** Measure text bounds using an offscreen canvas */
  const measureTextBounds = useCallback((text: string, fontSize: number, fontFamily: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return { width: 0, height: fontSize };

    ctx.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split("\n");
    const lineHeight = fontSize * TEXT_LINE_HEIGHT;
    let maxWidth = 0;
    for (const line of lines) {
      const m = ctx.measureText(line || " ");  // measure at least a space for empty lines
      if (m.width > maxWidth) maxWidth = m.width;
    }
    return {
      width: Math.max(TEXT_MIN_WIDTH, maxWidth),
      height: Math.max(lineHeight, lines.length * lineHeight),
    };
  }, []);

  /** Commit the current text editing into a shape */
  const commitTextShape = useCallback(() => {
    if (!textEditing) return;
    // Guard: don't commit until the user has actually interacted
    if (!textReadyToCommitRef.current) return;
    const { worldX, worldY, text, editingShapeId } = textEditing;

    // Clear debounce timer
    if (textBroadcastTimerRef.current) {
      clearTimeout(textBroadcastTimerRef.current);
      textBroadcastTimerRef.current = null;
    }

    // If text is empty, just cancel
    if (!text.trim()) {
      // If we were editing an existing shape, delete the live broadcast shape
      if (editingShapeId) {
        onShapeDeleted?.(editingShapeId);
      } else if (textShapeIdRef.current) {
        // Delete the live broadcast preview shape (if any was sent)
        onShapeDeleted?.(textShapeIdRef.current);
      }
      setTextEditing(null);
      textShapeIdRef.current = null;
      modeRef.current = { type: "none" };
      return;
    }

    const fontSize = TEXT_FONT_SIZE;
    const fontFamily = TEXT_FONT_FAMILY;
    const { width, height } = measureTextBounds(text, fontSize, fontFamily);

    const shapeId = textShapeIdRef.current || editingShapeId || crypto.randomUUID();
    const newShape: Shape = {
      id: shapeId,
      type: "text",
      x1: worldX,
      y1: worldY,
      x2: worldX + width,
      y2: worldY + height,
      text,
      fontSize,
      fontFamily,
      textAlign: "left",
      options: { ...DEFAULT_SHAPE_OPTIONS },
    };

    if (editingShapeId) {
      // Update existing shape
      commitShapes([...shapesRef.current.filter(s => s.id !== editingShapeId), newShape]);
      onShapeUpdated?.(newShape);
    } else {
      // Add new shape
      commitShapes([...shapesRef.current, newShape]);
      onShapeAdded?.(newShape);
    }

    setTextEditing(null);
    textShapeIdRef.current = null;
    modeRef.current = { type: "none" };
  }, [textEditing, measureTextBounds, commitShapes, onShapeAdded, onShapeUpdated, onShapeDeleted]);

  /** Handle text input changes with auto-resize and live broadcast */
  const handleTextInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!textEditing) return;
    const newText = e.target.value;
    setTextEditing(prev => prev ? { ...prev, text: newText } : null);

    // Auto-resize the textarea
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.width = "auto";
    // Measure the content
    const scale = cam().zoom / 100;
    const fontSize = TEXT_FONT_SIZE * scale;
    const { width, height } = measureTextBounds(newText || " ", TEXT_FONT_SIZE, TEXT_FONT_FAMILY);
    ta.style.width = `${Math.max(TEXT_MIN_WIDTH * scale, width * scale + TEXT_PADDING * 2)}px`;
    ta.style.height = `${Math.max(fontSize * TEXT_LINE_HEIGHT, height * scale + TEXT_PADDING)}px`;

    // Debounced live broadcast
    if (textBroadcastTimerRef.current) {
      clearTimeout(textBroadcastTimerRef.current);
    }
    textBroadcastTimerRef.current = setTimeout(() => {
      const shapeId = textShapeIdRef.current;
      if (!shapeId || !newText.trim()) return;
      const { width: w, height: h } = measureTextBounds(newText, TEXT_FONT_SIZE, TEXT_FONT_FAMILY);
      const liveShape: Shape = {
        id: shapeId,
        type: "text",
        x1: textEditing.worldX,
        y1: textEditing.worldY,
        x2: textEditing.worldX + w,
        y2: textEditing.worldY + h,
        text: newText,
        fontSize: TEXT_FONT_SIZE,
        fontFamily: TEXT_FONT_FAMILY,
        textAlign: "left",
        options: { ...DEFAULT_SHAPE_OPTIONS },
      };
      if (textEditing.editingShapeId) {
        onShapeUpdated?.(liveShape);
      } else {
        // Send as update (remote will upsert by id)
        onShapeUpdated?.(liveShape);
      }
    }, 300);
  }, [textEditing, measureTextBounds, onShapeUpdated]);

  /** Handle textarea keydown (Enter to commit, Shift+Enter for newline, Escape to cancel) */
  const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // Cancel: revert if editing existing shape
      if (textEditing?.editingShapeId) {
        // The shape was removed from canvas for editing; we need to restore it
        // Since we deleted it, fire delete for the broadcast preview
        onShapeDeleted?.(textEditing.editingShapeId);
      }
      if (textBroadcastTimerRef.current) {
        clearTimeout(textBroadcastTimerRef.current);
        textBroadcastTimerRef.current = null;
      }
      setTextEditing(null);
      textShapeIdRef.current = null;
      modeRef.current = { type: "none" };
      return;
    }
    // Tab - commit and prevent focus change
    if (e.key === "Tab") {
      e.preventDefault();
      commitTextShape();
      return;
    }
    // Stop propagation for all keys to prevent tool shortcuts while typing
    e.stopPropagation();
  }, [textEditing, commitTextShape, onShapeDeleted]);

  /** Auto-focus textarea when textEditing starts */
  useEffect(() => {
    if (textEditing && textareaRef.current) {
      const ta = textareaRef.current;
      // Use requestAnimationFrame to ensure the textarea is fully mounted
      requestAnimationFrame(() => {
        ta.focus();
        // If editing existing text, place cursor at end
        if (textEditing.text) {
          ta.selectionStart = ta.selectionEnd = textEditing.text.length;
        }
        // Set initial size
        const scale = cam().zoom / 100;
        const fontSize = TEXT_FONT_SIZE * scale;
        if (!textEditing.text) {
          ta.style.width = `${TEXT_MIN_WIDTH}px`;
          ta.style.height = `${fontSize * TEXT_LINE_HEIGHT}px`;
        } else {
          const { width, height } = measureTextBounds(textEditing.text, TEXT_FONT_SIZE, TEXT_FONT_FAMILY);
          ta.style.width = `${Math.max(TEXT_MIN_WIDTH * scale, width * scale + TEXT_PADDING * 2)}px`;
          ta.style.height = `${Math.max(fontSize * TEXT_LINE_HEIGHT, height * scale + TEXT_PADDING)}px`;
        }
        // Mark as ready to commit AFTER focus is established
        // This prevents onBlur from firing prematurely during initial render
        setTimeout(() => { textReadyToCommitRef.current = true; }, 50);
      });
    }
  }, [textEditing?.worldX, textEditing?.worldY]); // only re-run when position changes (new text creation)

  /** Commit text when tool changes away from text */
  useEffect(() => {
    if (activeTool !== "text" && activeTool !== "cursor" && textEditing) {
      commitTextShape();
    }
  }, [activeTool]);

  // ════════════════════════════════════════════════════════════════════════════
  // CURSOR RESOLUTION
  // ════════════════════════════════════════════════════════════════════════════

  const getCursorStyle = (): string => {
    if (dynamicCursor && activeTool === "cursor") return dynamicCursor;
    if (activeTool === "hand") return isGrabbing ? "grabbing" : "grab";
    return CURSOR_MAP[activeTool] || "default";
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <>
      {/* Layer 0: Background grid canvas */}
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 w-screen h-screen ${className}`}
        style={{ zIndex: 0 }}
      />
      {/* Layer 1: Committed shapes (drawn with rough.js + camera) */}
      <canvas
        ref={drawCanvasRef}
        className="fixed inset-0 w-screen h-screen"
        style={{ zIndex: 1, pointerEvents: "none" }}
      />
      {/* Layer 2: Overlay — preview + selection UI + eraser trail + cursor */}
      <canvas
        ref={overlayRef}
        className="fixed inset-0 w-screen h-screen"
        style={{
          zIndex: 2,
          cursor: getCursorStyle(),
          pointerEvents: "auto",
        }}
      />
      {/* Layer 3: Text editing textarea overlay */}
      {textEditing && (() => {
        const c = cam();
        const scale = c.zoom / 100;
        const [sx, sy] = worldToScreen(textEditing.worldX, textEditing.worldY, c);
        const fontSize = TEXT_FONT_SIZE * scale;

        return (
          <textarea
            ref={textareaRef}
            value={textEditing.text}
            onChange={handleTextInput}
            onKeyDown={handleTextKeyDown}
            onBlur={commitTextShape}
            autoFocus
            style={{
              position: "fixed",
              left: `${sx}px`,
              top: `${sy}px`,
              zIndex: 10,
              fontSize: `${fontSize}px`,
              fontFamily: TEXT_FONT_FAMILY,
              lineHeight: `${TEXT_LINE_HEIGHT}`,
              color: "#ffffff",
              background: "transparent",
              border: "1px solid rgba(79, 70, 229, 0.5)",
              borderRadius: "2px",
              outline: "none",
              resize: "none",
              overflow: "hidden",
              padding: `${TEXT_PADDING}px`,
              margin: 0,
              minWidth: `${TEXT_MIN_WIDTH}px`,
              minHeight: `${fontSize * TEXT_LINE_HEIGHT}px`,
              whiteSpace: "pre",
              wordBreak: "keep-all",
              caretColor: "#a8a5ff",
              transformOrigin: "top left",
            }}
          />
        );
      })()}
    </>
  );
});

// ════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS (outside component)
// ════════════════════════════════════════════════════════════════════════════

/** Resize a shape from a specific handle by delta amounts */
function resizeShape(orig: Shape, handle: HandleId, dx: number, dy: number): Shape {
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
function updateBoundsFromPoints(shape: Shape): void {
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
