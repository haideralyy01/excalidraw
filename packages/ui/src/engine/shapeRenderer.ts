import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Shape } from "../types";

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
  }
}