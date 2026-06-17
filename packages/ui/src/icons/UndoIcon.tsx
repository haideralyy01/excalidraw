import React from "react";

interface UndoIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function UndoIcon({ size = 16, color = "currentColor", className }: UndoIconProps) {
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
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 10h10a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H8" />
      <polyline points="7 14 3 10 7 6" />
    </svg>
  );
}
