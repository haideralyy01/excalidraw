import React from "react";

interface ArrowToolIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function ArrowToolIcon({ size = 20, color = "currentColor", className }: ArrowToolIconProps) {
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
        <path d="M5 12h14" />
        <path d="M15 16l4-4" />
        <path d="M15 8l4 4" />
      </g>
    </svg>
  );
}
