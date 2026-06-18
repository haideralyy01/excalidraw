import { useState, useRef, useEffect, useCallback } from "react";
import type { Shape } from "../../types";
import { Camera } from "../../engine/camera";
import {
  TEXT_FONT_SIZE,
  TEXT_FONT_FAMILY,
  TEXT_LINE_HEIGHT,
  TEXT_MIN_WIDTH,
  TEXT_PADDING,
  DEFAULT_SHAPE_OPTIONS,
} from "./canvasConstants";

interface UseCanvasTextOptions {
  shapesRef: React.MutableRefObject<Shape[]>;
  commitShapes: (next: Shape[]) => void;
  onShapeAdded?: (shape: Shape) => void;
  onShapeUpdated?: (shape: Shape) => void;
  onShapeDeleted?: (shapeId: string) => void;
  cam: () => Camera;
  activeTool: string;
  onFinishEditing?: () => void;
}

export function useCanvasText({
  shapesRef,
  commitShapes,
  onShapeAdded,
  onShapeUpdated,
  onShapeDeleted,
  cam,
  activeTool,
  onFinishEditing,
}: UseCanvasTextOptions) {
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
      onFinishEditing?.();
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
    onFinishEditing?.();
  }, [textEditing, measureTextBounds, commitShapes, onShapeAdded, onShapeUpdated, onShapeDeleted, onFinishEditing]);

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
      onShapeUpdated?.(liveShape);
    }, 300);
  }, [textEditing, measureTextBounds, onShapeUpdated, cam]);

  /** Handle textarea keydown (Enter to commit, Shift+Enter for newline, Escape to cancel) */
  const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      // Cancel: revert if editing existing shape
      if (textEditing?.editingShapeId) {
        onShapeDeleted?.(textEditing.editingShapeId);
      }
      if (textBroadcastTimerRef.current) {
        clearTimeout(textBroadcastTimerRef.current);
        textBroadcastTimerRef.current = null;
      }
      setTextEditing(null);
      textShapeIdRef.current = null;
      onFinishEditing?.();
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
  }, [textEditing, commitTextShape, onShapeDeleted, onFinishEditing]);

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
        setTimeout(() => { textReadyToCommitRef.current = true; }, 50);
      });
    }
  }, [textEditing?.worldX, textEditing?.worldY, cam, measureTextBounds]);

  /** Commit text when tool changes away from text */
  useEffect(() => {
    if (activeTool !== "text" && activeTool !== "cursor" && textEditing) {
      commitTextShape();
    }
  }, [activeTool, textEditing, commitTextShape]);

  return {
    textEditing,
    setTextEditing,
    textareaRef,
    textShapeIdRef,
    textReadyToCommitRef,
    measureTextBounds,
    commitTextShape,
    handleTextInput,
    handleTextKeyDown,
  };
}
