import React from "react";

interface StopIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function StopIcon({ size = 20, color = "currentColor", className }: StopIconProps) {
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
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}
