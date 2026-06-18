import { useRef, useEffect, useCallback } from "react";
import { TRAIL_MAX_AGE } from "./canvasConstants";

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

interface UseCanvasEraserOptions {
  activeTool: string;
  overlayRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useCanvasEraser({ activeTool, overlayRef }: UseCanvasEraserOptions) {
  // ── Eraser trail refs ──
  const trailRef = useRef<TrailPoint[]>([]);
  const animFrameRef = useRef<number>(0);

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr);
  }, [overlayRef]);

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
  }, [overlayRef]);

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

  return {
    trailRef,
    animFrameRef,
    animateTrail,
    clearOverlay,
  };
}
