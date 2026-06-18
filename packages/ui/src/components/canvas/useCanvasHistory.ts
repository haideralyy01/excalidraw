import { useState, useRef, useCallback } from "react";
import type { Shape } from "../../types";

interface UseCanvasHistoryOptions {
  onShapesChange?: (shapes: Shape[]) => void;
}

export function useCanvasHistory({ onShapesChange }: UseCanvasHistoryOptions = {}) {
  // ── Shape state ──
  const [shapes, setShapes] = useState<Shape[]>([]);
  const shapesRef = useRef<Shape[]>([]);
  shapesRef.current = shapes;

  const undoStackRef = useRef<Shape[][]>([]);
  const redoStackRef = useRef<Shape[][]>([]);

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

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (prev === undefined) return;
    redoStackRef.current.push([...shapesRef.current]);
    setShapes(prev);
    onShapesChange?.(prev);
  }, [onShapesChange]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (next === undefined) return;
    undoStackRef.current.push([...shapesRef.current]);
    setShapes(next);
    onShapesChange?.(next);
  }, [onShapesChange]);

  return {
    shapes,
    setShapes,
    shapesRef,
    undoStackRef,
    redoStackRef,
    commitShapes,
    updateShapeLive,
    undo,
    redo,
  };
}
