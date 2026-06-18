import type { Shape } from "../../types";

export const SHAPE_TOOLS = new Set<string>([
  "rectangle",
  "diamond",
  "circle",
  "line",
  "arrow",
]);

export const DEFAULT_SHAPE_OPTIONS: Shape["options"] = {
  stroke: "#ffffff",
  strokeWidth: 2,
  roughness: 1.5,
  fill: "transparent",
  fillStyle: "hachure",
};

export const ERASER_CURSOR_SIZE = 12;
export const ERASER_CURSOR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${ERASER_CURSOR_SIZE}" height="${ERASER_CURSOR_SIZE}" viewBox="0 0 ${ERASER_CURSOR_SIZE} ${ERASER_CURSOR_SIZE}">
  <circle cx="${ERASER_CURSOR_SIZE / 2}" cy="${ERASER_CURSOR_SIZE / 2}" r="${ERASER_CURSOR_SIZE / 2 - 1}" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
</svg>`;
export const ERASER_CURSOR_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(ERASER_CURSOR_SVG.trim())}") ${ERASER_CURSOR_SIZE / 2} ${ERASER_CURSOR_SIZE / 2}, auto`;

export const CURSOR_MAP: Record<string, string> = {
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

export const TRAIL_MAX_AGE = 600;
export const WAVE_AMPLITUDE = 6;
export const WAVE_FREQUENCY = 0.12;

export const TEXT_FONT_SIZE = 20;
export const TEXT_FONT_FAMILY = "Virgil, Segoe UI Emoji, Apple Color Emoji, sans-serif";
export const TEXT_LINE_HEIGHT = 1.35;
export const TEXT_MIN_WIDTH = 100;
export const TEXT_PADDING = 4;
