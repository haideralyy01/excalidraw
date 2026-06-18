import { useState, useEffect, useRef } from "react";
import { Camera, zoomTowardPoint, zoomScale } from "../../engine/camera";

interface UseCanvasCameraOptions {
  zoom: number;
  onZoomChange?: (zoom: number) => void;
}

export function useCanvasCamera({ zoom, onZoomChange }: UseCanvasCameraOptions) {
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
  const zoomFocalRef = useRef<{ cx: number; cy: number; wx: number; wy: number } | null>(null);

  const cam = (): Camera => visualCameraRef.current;
  const targetCam = (): Camera => targetCameraRef.current;

  // ── Effect to detect external zoom changes and focus zoom on screen center ──
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
        // If we were zooming, snap everything to target zoom and target scroll
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

  // ── Zoom / scroll wheel listener ──
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

  // ── Keyboard zoom listeners (Ctrl+Plus / Ctrl+Minus) ──
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

  return {
    scrollX,
    scrollY,
    setScrollX,
    setScrollY,
    visualZoom,
    visualScrollX,
    visualScrollY,
    visualCameraRef,
    targetCameraRef,
    zoomFocalRef,
    cam,
    targetCam,
  };
}
