"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";

// ── Custom eraser cursor: 12px hollow circle ──
const ERASER_CURSOR_SIZE = 12;
const ERASER_CURSOR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ERASER_CURSOR_SIZE}" height="${ERASER_CURSOR_SIZE}" viewBox="0 0 ${ERASER_CURSOR_SIZE} ${ERASER_CURSOR_SIZE}">
  <circle cx="${ERASER_CURSOR_SIZE / 2}" cy="${ERASER_CURSOR_SIZE / 2}" r="${ERASER_CURSOR_SIZE / 2 - 1}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
</svg>`;
const ERASER_CURSOR_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(ERASER_CURSOR_SVG.trim())}") ${ERASER_CURSOR_SIZE / 2} ${ERASER_CURSOR_SIZE / 2}, auto`;

// ── Cursor map per tool ──
const CURSOR_MAP: Record<string, string> = {
  hand: "grab",
  cursor: "default",
  rectangle: "crosshair",
  diamond: "crosshair",
  circle: "crosshair",
  arrow: "crosshair",
  line: "crosshair",
  pen: "crosshair",
  text: "crosshair",
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

const TRAIL_MAX_AGE = 600; // ms — how long each point lives
const WAVE_AMPLITUDE = 6; // px — height of the wave oscillation
const WAVE_FREQUENCY = 0.12; // how tight the waves are

interface CanvasProps {
  backgroundColor?: string;
  showGrid?: boolean;
  gridColor?: string;
  gridSpacing?: number;
  className?: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  activeTool?: string;
}

export function Canvas({
  backgroundColor = "#121212",
  showGrid = true,
  gridColor = "rgba(255, 255, 255, 0.06)",
  gridSpacing = 20,
  className = "",
  zoom = 100,
  onZoomChange,
  activeTool = "cursor",
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const animFrameRef = useRef<number>(0);
  const [isGrabbing, setIsGrabbing] = useState(false);

  // ── Draw the background grid ──
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

    // Scale grid spacing based on zoom level
    const scale = zoom / 100;
    const scaledSpacing = gridSpacing * scale;

    // Draw dot grid
    if (showGrid && scaledSpacing > 4) {
      ctx.fillStyle = gridColor;
      const dotRadius = Math.max(0.5, 1 * scale);

      for (let x = scaledSpacing; x < width; x += scaledSpacing) {
        for (let y = scaledSpacing; y < height; y += scaledSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [backgroundColor, showGrid, gridColor, gridSpacing, zoom]);

  useEffect(() => {
    drawGrid();

    const handleResize = () => drawGrid();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawGrid]);

  // ── Resize overlay canvas to match window ──
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

  // ── Eraser wavy trail animation loop ──
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
    const trail = trailRef.current;

    // Remove expired points
    trailRef.current = trail.filter((p) => now - p.time < TRAIL_MAX_AGE);

    const points = trailRef.current;

    if (points.length < 2) {
      if (points.length === 0) {
        animFrameRef.current = 0;
        return;
      }
      animFrameRef.current = requestAnimationFrame(animateTrail);
      return;
    }

    // Draw the wavy trail: for each segment between consecutive points,
    // offset perpendicular to the direction with a sine wave, and fade by age.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const curr = points[i]!;

      // Age-based opacity (oldest = 0, newest = 1)
      const age = now - curr.time;
      const opacity = Math.max(0, 1 - age / TRAIL_MAX_AGE);

      // Direction vector
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) continue;

      // Perpendicular unit vector
      const nx = -dy / len;
      const ny = dx / len;

      // Use cumulative index for smooth wave phase
      const waveOffset = Math.sin(i * WAVE_FREQUENCY * Math.PI * 2) * WAVE_AMPLITUDE * opacity;

      const x1 = prev.x + nx * Math.sin((i - 1) * WAVE_FREQUENCY * Math.PI * 2) * WAVE_AMPLITUDE * Math.max(0, 1 - (now - prev.time) / TRAIL_MAX_AGE);
      const y1 = prev.y + ny * Math.sin((i - 1) * WAVE_FREQUENCY * Math.PI * 2) * WAVE_AMPLITUDE * Math.max(0, 1 - (now - prev.time) / TRAIL_MAX_AGE);
      const x2 = curr.x + nx * waveOffset;
      const y2 = curr.y + ny * waveOffset;

      // Draw segment with gradient opacity
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(168, 165, 255, ${opacity * 0.6})`;
      ctx.lineWidth = Math.max(1, 3 * opacity);
      ctx.stroke();
    }

    // Secondary thinner wave offset by half period for the wavy look
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]!;
      const curr = points[i]!;

      const age = now - curr.time;
      const opacity = Math.max(0, 1 - age / TRAIL_MAX_AGE);

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) continue;

      const nx = -dy / len;
      const ny = dx / len;

      // Offset by π for second wave strand
      const waveOffset = Math.sin(i * WAVE_FREQUENCY * Math.PI * 2 + Math.PI) * WAVE_AMPLITUDE * 0.6 * opacity;

      const x1 = prev.x + nx * Math.sin((i - 1) * WAVE_FREQUENCY * Math.PI * 2 + Math.PI) * WAVE_AMPLITUDE * 0.6 * Math.max(0, 1 - (now - prev.time) / TRAIL_MAX_AGE);
      const y1 = prev.y + ny * Math.sin((i - 1) * WAVE_FREQUENCY * Math.PI * 2 + Math.PI) * WAVE_AMPLITUDE * 0.6 * Math.max(0, 1 - (now - prev.time) / TRAIL_MAX_AGE);
      const x2 = curr.x + nx * waveOffset;
      const y2 = curr.y + ny * waveOffset;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(168, 165, 255, ${opacity * 0.3})`;
      ctx.lineWidth = Math.max(0.5, 1.5 * opacity);
      ctx.stroke();
    }

    if (trailRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(animateTrail);
    } else {
      animFrameRef.current = 0;
      ctx.clearRect(0, 0, width, height);
    }
  }, []);

  // ── Eraser mousemove handler: record trail points ──
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    if (activeTool !== "eraser") {
      // Clear trail when switching away from eraser
      trailRef.current = [];
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      const ctx = overlay.getContext("2d");
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      trailRef.current.push({
        x: e.clientX,
        y: e.clientY,
        time: performance.now(),
      });

      // Cap trail length to avoid memory bloat
      if (trailRef.current.length > 200) {
        trailRef.current = trailRef.current.slice(-150);
      }

      // Start animation loop if not running
      if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(animateTrail);
      }
    };

    overlay.addEventListener("mousemove", handleMouseMove);
    return () => {
      overlay.removeEventListener("mousemove", handleMouseMove);
    };
  }, [activeTool, animateTrail]);

  // ── Clean up animation on unmount ──
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // ── Zoom via Ctrl+wheel ──
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (onZoomChange) {
          const direction = e.deltaY < 0 ? 1 : -1;
          onZoomChange(Math.min(300, Math.max(10, zoom + direction * 10)));
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [zoom, onZoomChange]);

  // ── Zoom via Ctrl+Plus / Ctrl+Minus ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "+" || e.key === "=" || e.key === "-")) {
        e.preventDefault();
        if (onZoomChange) {
          const direction = e.key === "-" ? -1 : 1;
          onZoomChange(Math.min(300, Math.max(10, zoom + direction * 10)));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoom, onZoomChange]);

  // ── Hand tool: grabbing on mousedown ──
  const handleMouseDown = useCallback(() => {
    if (activeTool === "hand") {
      setIsGrabbing(true);
    }
  }, [activeTool]);

  const handleMouseUp = useCallback(() => {
    if (isGrabbing) {
      setIsGrabbing(false);
    }
  }, [isGrabbing]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  // ── Resolve cursor style ──
  const getCursorStyle = (): string => {
    if (activeTool === "hand") {
      return isGrabbing ? "grabbing" : "grab";
    }
    return CURSOR_MAP[activeTool] || "default";
  };

  return (
    <>
      {/* Background grid canvas */}
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 w-screen h-screen ${className}`}
        style={{ zIndex: 0 }}
      />
      {/* Overlay canvas for eraser wave animation + cursor */}
      <canvas
        ref={overlayRef}
        className="fixed inset-0 w-screen h-screen"
        style={{
          zIndex: 1,
          cursor: getCursorStyle(),
          pointerEvents: "auto",
        }}
        onMouseDown={handleMouseDown}
      />
    </>
  );
}
