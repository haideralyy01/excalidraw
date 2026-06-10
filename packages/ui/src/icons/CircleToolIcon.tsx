import React from "react";

interface CircleToolIconProps {
  size?: number;
  color?: string;
  className?: string;
  filled?: boolean;
}

export function CircleToolIcon({ size = 20, color = "currentColor", className, filled = false }: CircleToolIconProps) {
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
        <circle cx="12" cy="12" r="9" fill={filled ? color : "none"} fillOpacity={filled ? 0.25 : 0} />
      </g>
    </svg>
  );
}
