import React from "react";

interface RedoIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function RedoIcon({ size = 16, color = "currentColor", className }: RedoIconProps) {
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
      <path d="M21 10H11a5 5 0 0 0-5 5v0a5 5 0 0 0 5 5h5" />
      <polyline points="17 14 21 10 17 6" />
    </svg>
  );
}
