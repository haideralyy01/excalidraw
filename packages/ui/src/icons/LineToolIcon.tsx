import React from "react";

interface LineToolIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function LineToolIcon({ size = 20, color = "currentColor", className }: LineToolIconProps) {
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
        <path d="M4 12h16" />
      </g>
    </svg>
  );
}
