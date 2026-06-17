import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Shape } from "../types";

/** Default text settings (matching Excalidraw's hand-drawn style) */
const DEFAULT_FONT_SIZE = 20;
const DEFAULT_FONT_FAMILY = "Virgil, Segoe UI Emoji, Apple Color Emoji, sans-serif";
const TEXT_LINE_HEIGHT = 1.35;

export function renderShape(rc: RoughCanvas, shape: Shape) {
  const { type, x1, y1, x2, y2, options } = shape;
  const roughOpts = { ...options, seed: options.seed };

  switch (type) {
    case "rectangle":
      rc.rectangle(x1, y1, x2 - x1, y2 - y1, roughOpts);
      break;
    case "circle": {
      // Draw ellipse inscribed in the bounding box
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      rc.ellipse(cx, cy, Math.abs(x2 - x1), Math.abs(y2 - y1), roughOpts);
      break;
    }
    case "diamond": {
      // Diamond = rotated rectangle as a polygon
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      rc.polygon([
        [cx, y1],
        [x2, cy],
        [cx, y2],
        [x1, cy],
      ], roughOpts);
      break;
    }
    case "line":
      rc.line(x1, y1, x2, y2, roughOpts);
      break;
    case "arrow": {
      // Draw line + arrowhead
      rc.line(x1, y1, x2, y2, roughOpts);
      // Arrowhead calculation
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 16;
      rc.line(
        x2, y2,
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6),
        roughOpts
      );
      rc.line(
        x2, y2,
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6),
        roughOpts
      );
      break;
    }
    case "text": {
      renderText(rc, shape);
      break;
    }
  }
}

/**
 * Render a text shape onto the canvas.
 * We bypass rough.js and draw directly via the 2D context because
 * rough.js only handles geometric primitives.
 */
function renderText(rc: RoughCanvas, shape: Shape): void {
  // Access the underlying canvas 2D context from the RoughCanvas
  const canvas = (rc as any).canvas as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const text = shape.text || "";
  if (!text) return;

  const fontSize = shape.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = shape.fontFamily ?? DEFAULT_FONT_FAMILY;
  const lineHeight = fontSize * TEXT_LINE_HEIGHT;

  ctx.save();

  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = shape.options.stroke || "#ffffff";
  ctx.textBaseline = "top";
  ctx.textAlign = (shape.textAlign as CanvasTextAlign) || "left";

  const lines = text.split("\n");
  const alignX =
    shape.textAlign === "center" ? (shape.x1 + shape.x2) / 2 :
    shape.textAlign === "right" ? shape.x2 :
    shape.x1;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!, alignX, shape.y1 + i * lineHeight);
  }

  ctx.restore();
}