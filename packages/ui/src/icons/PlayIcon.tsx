import React from "react";

interface PlayIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function PlayIcon({ size = 20, color = "currentColor", className }: PlayIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      stroke="none"
      className={className}
    >
      <polygon points="6,3 20,12 6,21" />
    </svg>
  );
}
