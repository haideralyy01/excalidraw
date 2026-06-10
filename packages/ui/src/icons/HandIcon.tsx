import React from "react";

interface HandIconProps {
  size?: number;
  color?: string;
  className?: string;
}

export function HandIcon({ size = 20, color = "currentColor", className }: HandIconProps) {
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
        <path d="M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5" />
        <path d="M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5" />
        <path d="M14 5.5a1.5 1.5 0 0 1 3 0v6.5" />
        <path d="M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1-6 6h-2a7 7 0 0 1-5-2l-2.8-2.8a1.5 1.5 0 0 1 2.1-2.1l1.7 1.7" />
      </g>
    </svg>
  );
}
