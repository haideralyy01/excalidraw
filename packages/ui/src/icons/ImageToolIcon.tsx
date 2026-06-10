import React from "react";

interface ImageToolIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function ImageToolIcon({ size = 20, color = "currentColor", className }: ImageToolIconProps) {
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
      <g strokeWidth="1.75">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M15 8h.01" />
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M4 15l4-4a3 5 0 0 1 3 0l5 5" />
        <path d="M14 14l1-1a3 5 0 0 1 3 0l2 2" />
      </g>
    </svg>
  );
}
