"use client";

import React, { useRef, useEffect, useCallback } from "react";

interface CanvasProps {
  backgroundColor?: string;
  showGrid?: boolean;
  gridColor?: string;
  gridSpacing?: number;
  className?: string;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export function Canvas({
  backgroundColor = "#121212",
  showGrid = true,
  gridColor = "rgba(255, 255, 255, 0.06)",
  gridSpacing = 20,
  className = "",
  zoom = 100,
  onZoomChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match device pixels for crisp rendering
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

  // Intercept Ctrl+wheel (trackpad pinch-to-zoom) and zoom canvas instead of browser
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (onZoomChange) {
          // deltaY < 0 = pinch out (zoom in), deltaY > 0 = pinch in (zoom out)
          const direction = e.deltaY < 0 ? 1 : -1;
          onZoomChange(Math.min(300, Math.max(10, zoom + direction * 10)));
        }
      }
    };

    // Must use { passive: false } to be able to preventDefault on wheel
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [zoom, onZoomChange]);

  // Also prevent browser Ctrl+Plus / Ctrl+Minus zoom
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

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-screen h-screen ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
