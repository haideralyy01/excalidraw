"use client";

import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import rough from "roughjs";
import type { Shape, ShapeType, HandleId } from "../types";
import { renderShape } from "../engine/shapeRenderer";
import {
  screenToWorld,
  worldToScreen,
  applyCameraTransform,
  zoomScale,
} from "../engine/camera";
import {
  hitTestShape,
  hitTestHandle,
  hitTestLinePoint,
  hitTestLineMidpoint,
  handleCursor,
} from "../engine/hitTest";
import { drawSelectionUI } from "../engine/selectionRenderer";

// Custom extracted canvas modular components
import {
  SHAPE_TOOLS,
  DEFAULT_SHAPE_OPTIONS,
  CURSOR_MAP,
  TEXT_FONT_SIZE,
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
  TEXT_MIN_WIDTH,
  TEXT_PADDING,
} from "./canvas/canvasConstants";
import {
  resizeShape,
  updateBoundsFromPoints,
} from "./canvas/canvasUtils";
import { useCanvasCamera } from "./canvas/useCanvasCamera";
import { useCanvasHistory } from "./canvas/useCanvasHistory";
import { useCanvasEraser } from "./canvas/useCanvasEraser";
import { useCanvasText } from "./canvas/useCanvasText";

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
  onShapeAdded?: (shape: Shape) => void;
  onShapeUpdated?: (shape: Shape) => void;
  onShapeDeleted?: (shapeId: string) => void;
}

export interface CanvasHandle {
  addRemoteShape: (shape: Shape) => void;
  updateRemoteShape: (shape: Shape) => void;
  deleteRemoteShape: (shapeId: string) => void;
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

  // ── 1. Camera state and events ──
  const camera = useCanvasCamera({ zoom, onZoomChange });

  // ── 2. Shape history / Undo & Redo ──
  const history = useCanvasHistory({ onShapesChange });

  // ── 3. Eraser trail animation ──
  const eraser = useCanvasEraser({ activeTool, overlayRef });

  // ── Interaction mode ref ──
  const modeRef = useRef<InteractionMode>({ type: "none" });

  // ── 4. Text editing ──
  const text = useCanvasText({
    shapesRef: history.shapesRef,
    commitShapes: history.commitShapes,
    onShapeAdded,
    onShapeUpdated,
    onShapeDeleted,
    cam: camera.cam,
    activeTool,
    onFinishEditing: useCallback(() => {
      modeRef.current = { type: "none" };
    }, []),
  });

  // ── Expose imperative methods for remote shape sync ──
  useImperativeHandle(ref, () => ({
    addRemoteShape(shape: Shape) {
      history.setShapes(prev => {
        if (prev.some(s => s.id === shape.id)) return prev; // dedupe
        return [...prev, shape];
      });
    },
    updateRemoteShape(shape: Shape) {
      history.setShapes(prev => {
        const idx = prev.findIndex(s => s.id === shape.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = shape;
          return next;
        }
        return [...prev, shape];
      });
    },
    deleteRemoteShape(shapeId: string) {
      history.setShapes(prev => prev.filter(s => s.id !== shapeId));
    },
    loadShapes(newShapes: Shape[]) {
      history.setShapes(newShapes);
      history.undoStackRef.current = [];
      history.redoStackRef.current = [];
    },
  }), [history]);

  // ── Selection state ──
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // ── Dynamic cursor ──
  const [dynamicCursor, setDynamicCursor] = useState<string | null>(null);

  // ── Hand tool grab state ──
  const [isGrabbing, setIsGrabbing] = useState(false);

  // ════════════════════════════════════════════════════════════════════════════
  // BACKGROUND GRID (z:0) — respects pan
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

    const scale = camera.visualZoom / 100;
    const scaledSpacing = gridSpacing * scale;

    if (showGrid && scaledSpacing > 4) {
      ctx.fillStyle = gridColor;
      const dotRadius = Math.max(0.5, 1 * scale);

      // Offset grid by scroll so dots move with pan
      const offsetX = (camera.visualScrollX * scale) % scaledSpacing;
      const offsetY = (camera.visualScrollY * scale) % scaledSpacing;

      for (let x = offsetX; x < width; x += scaledSpacing) {
        for (let y = offsetY; y < height; y += scaledSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [backgroundColor, showGrid, gridColor, gridSpacing, camera.visualZoom, camera.visualScrollX, camera.visualScrollY]);

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
    const c = camera.cam();
    applyCameraTransform(ctx, c, dpr);

    const rc = rough.canvas(drawCanvas);
    for (const shape of shapesToDraw) {
      renderShape(rc, shape);
    }

    // Reset transform
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [camera]);

  useEffect(() => {
    resizeDrawCanvas();
    const handleResize = () => {
      resizeDrawCanvas();
      redrawAllShapes(history.shapes);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resizeDrawCanvas, redrawAllShapes, history.shapes]);

  // Re-render shapes whenever they, visualZoom, or visualScroll change
  useEffect(() => {
    redrawAllShapes(history.shapes);
  }, [history.shapes, redrawAllShapes, camera.visualZoom, camera.visualScrollX, camera.visualScrollY]);

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
    const shape = history.shapesRef.current.find(s => s.id === selectedShapeId);
    if (!shape) return;

    drawSelectionUI(ctx, shape, camera.cam());
  }, [selectedShapeId, camera, history.shapesRef]);

  useEffect(() => {
    // Only draw selection UI when not in eraser mode and not mid-drawing
    if (activeTool === "eraser") return;
    if (modeRef.current.type === "drawing") return;
    drawSelectionOverlay();
  }, [selectedShapeId, history.shapes, camera.visualZoom, camera.visualScrollX, camera.visualScrollY, drawSelectionOverlay, activeTool]);

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
    const c = camera.cam();
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
  }, [activeTool, camera]);

  const { clearOverlay } = eraser;

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

      const c = camera.cam();
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
        history.undoStackRef.current.push([...history.shapesRef.current]);
        history.redoStackRef.current = [];
        modeRef.current = { type: "erasing", hasErased: false };

        eraser.trailRef.current = [{ x: e.clientX, y: e.clientY, time: performance.now() }];
        if (!eraser.animFrameRef.current) {
          eraser.animFrameRef.current = requestAnimationFrame(eraser.animateTrail);
        }

        const remaining = history.shapesRef.current.filter(s => !hitTestShape(s, wx, wy, hitThreshold));
        if (remaining.length !== history.shapesRef.current.length) {
          // Find erased shapes and notify
          const erasedIds = history.shapesRef.current.filter(s => hitTestShape(s, wx, wy, hitThreshold)).map(s => s.id);
          history.setShapes(remaining);
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
        if (text.textEditing) {
          text.commitTextShape();
          return;
        }
        text.textReadyToCommitRef.current = false;
        text.setTextEditing({ worldX: wx, worldY: wy, text: "", editingShapeId: null });
        text.textShapeIdRef.current = crypto.randomUUID();
        modeRef.current = { type: "editing-text" };
        return;
      }

      // ── CURSOR TOOL: selection / move / resize / node drag ──
      if (activeTool === "cursor") {
        // 1. If we have a selected shape, check handles first
        if (selectedShapeId) {
          const selShape = history.shapesRef.current.find(s => s.id === selectedShapeId);
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
                history.setShapes(prev => prev.map(s => s.id === selShape.id ? updatedShape : s));
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
        for (let i = history.shapesRef.current.length - 1; i >= 0; i--) {
          const s = history.shapesRef.current[i]!;
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
      const c = camera.cam();
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
          camera.setScrollX(prev => prev + dx / s);
          camera.setScrollY(prev => prev + dy / s);
          return;
        }
        case "moving": {
          const dx = wx - mode.startWX;
          const dy = wy - mode.startWY;
          const orig = mode.origShape;
          history.updateShapeLive(mode.shapeId, () => {
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
          history.updateShapeLive(mode.shapeId, () => {
            return resizeShape(orig, mode.handle, dx, dy);
          });
          return;
        }
        case "dragging-point": {
          const dx = wx - mode.startWX;
          const dy = wy - mode.startWY;
          history.updateShapeLive(mode.shapeId, (s) => {
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
          eraser.trailRef.current.push({ x: e.clientX, y: e.clientY, time: performance.now() });
          if (eraser.trailRef.current.length > 200) {
            eraser.trailRef.current = eraser.trailRef.current.slice(-150);
          }
          if (!eraser.animFrameRef.current) {
            eraser.animFrameRef.current = requestAnimationFrame(eraser.animateTrail);
          }

          const hitThreshold = 8 / scale;
          const remaining = history.shapesRef.current.filter(s => !hitTestShape(s, wx, wy, hitThreshold));
          if (remaining.length !== history.shapesRef.current.length) {
            const erasedIds = history.shapesRef.current.filter(s => hitTestShape(s, wx, wy, hitThreshold)).map(s => s.id);
            history.setShapes(remaining);
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
          const selShape = history.shapesRef.current.find(s => s.id === selectedShapeId);
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
        for (let i = history.shapesRef.current.length - 1; i >= 0; i--) {
          if (hitTestShape(history.shapesRef.current[i]!, wx, wy, 8 / scale)) {
            setDynamicCursor("move");
            return;
          }
        }
        setDynamicCursor(null);
      }
    };

    // ── mouseup ──
    const handleMouseUp = (e: MouseEvent) => {
      const c = camera.cam();
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

          history.commitShapes([...history.shapesRef.current, newShape]);
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
          const movedShape = history.shapesRef.current.find(s => s.id === mode.shapeId);
          history.commitShapes([...history.shapesRef.current]);
          if (movedShape) onShapeUpdated?.(movedShape);
          modeRef.current = { type: "none" };
          return;
        }
        case "resizing": {
          const resizedShape = history.shapesRef.current.find(s => s.id === mode.shapeId);
          history.commitShapes([...history.shapesRef.current]);
          if (resizedShape) onShapeUpdated?.(resizedShape);
          modeRef.current = { type: "none" };
          return;
        }
        case "dragging-point": {
          const draggedShape = history.shapesRef.current.find(s => s.id === mode.shapeId);
          history.commitShapes([...history.shapesRef.current]);
          if (draggedShape) onShapeUpdated?.(draggedShape);
          modeRef.current = { type: "none" };
          return;
        }
        case "erasing": {
          const modeVal = mode;
          modeRef.current = { type: "none" };
          if (modeVal.hasErased) {
            onShapesChange?.(history.shapesRef.current);
          } else {
            history.undoStackRef.current.pop();
          }
          return;
        }
      }
    };

    // ── dblclick — edit existing text shapes ──
    const handleDblClick = (e: MouseEvent) => {
      if (activeTool !== "cursor") return;
      const c = camera.cam();
      const [wx, wy] = screenToWorld(e.clientX, e.clientY, c);
      const scale = zoomScale(c);
      const hitThreshold = 8 / scale;

      // Find topmost text shape under cursor
      for (let i = history.shapesRef.current.length - 1; i >= 0; i--) {
        const s = history.shapesRef.current[i]!;
        if (s.type === "text" && hitTestShape(s, wx, wy, hitThreshold)) {
          // Open textarea for editing
          text.setTextEditing({
            worldX: s.x1,
            worldY: s.y1,
            text: s.text || "",
            editingShapeId: s.id,
          });
          text.textShapeIdRef.current = s.id;
          text.textReadyToCommitRef.current = false;
          modeRef.current = { type: "editing-text" };
          // Hide the canvas-rendered text while editing
          history.setShapes(prev => prev.filter(sh => sh.id !== s.id));
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
  }, [
    activeTool,
    selectedShapeId,
    drawPreview,
    clearOverlay,
    history,
    camera,
    eraser,
    text,
    onShapeAdded,
    onShapeUpdated,
    onShapeDeleted,
    onShapesChange,
    drawSelectionOverlay,
  ]);

  // ════════════════════════════════════════════════════════════════════════════
  // KEYBOARD — undo/redo + delete
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ctrl+Z → undo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
        setSelectedShapeId(null);
        return;
      }
      // Ctrl+Shift+Z → redo
      if (e.ctrlKey && e.key === "Z" && e.shiftKey) {
        e.preventDefault();
        history.redo();
        setSelectedShapeId(null);
        return;
      }
      // Ctrl+Y → redo
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        history.redo();
        setSelectedShapeId(null);
        return;
      }
      // Delete / Backspace → delete selected shape
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShapeId) {
        e.preventDefault();
        history.commitShapes(history.shapesRef.current.filter(s => s.id !== selectedShapeId));
        onShapeDeleted?.(selectedShapeId);
        setSelectedShapeId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, selectedShapeId, onShapeDeleted]);

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
      {/* Layer 1: Committed shapes */}
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
      {text.textEditing && (() => {
        const c = camera.cam();
        const scale = c.zoom / 100;
        const [sx, sy] = worldToScreen(text.textEditing.worldX, text.textEditing.worldY, c);
        const fontSize = TEXT_FONT_SIZE * scale;

        return (
          <textarea
            ref={text.textareaRef}
            value={text.textEditing.text}
            onChange={text.handleTextInput}
            onKeyDown={text.handleTextKeyDown}
            onBlur={text.commitTextShape}
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
