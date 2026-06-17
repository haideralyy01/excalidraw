import React from "react";

interface ZoomOutIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function ZoomOutIcon({ size = 14, color = "currentColor", className }: ZoomOutIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
