import React from "react";

interface DiamondToolIconProps {
  size?: number;
  color?: string;
  className?: string;
  filled?: boolean;
}

export function DiamondToolIcon({ size = 20, color = "currentColor", className, filled = false }: DiamondToolIconProps) {
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
        <path d="M12 2l10 10l-10 10l-10-10z" fill={filled ? color : "none"} fillOpacity={filled ? 0.25 : 0} />
      </g>
    </svg>
  );
}
