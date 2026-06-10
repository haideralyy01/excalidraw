import React from "react";

interface LockIconProps {
  size?: number;
  color?: string;
  className?: string;
  locked?: boolean;
}

export function LockIcon({ size = 20, color = "currentColor", className, locked = false }: LockIconProps) {
  if (locked) {
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        role="img"
        viewBox="0 0 20 20"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <g>
          <path
            d="M13.542 8.542H6.458a2.5 2.5 0 0 0-2.5 2.5v3.75a2.5 2.5 0 0 0 2.5 2.5h7.084a2.5 2.5 0 0 0 2.5-2.5v-3.75a2.5 2.5 0 0 0-2.5-2.5Z"
            stroke={color}
            strokeWidth="1.25"
            fill={color}
            fillOpacity="0.2"
          />
          <path
            d="M10 13.958a1.042 1.042 0 1 0 0-2.083 1.042 1.042 0 0 0 0 2.083Z"
            stroke={color}
            strokeWidth="1.25"
          />
          <path
            d="M6.667 8.542V5.833a3.333 3.333 0 1 1 6.667 0v2.709"
            stroke={color}
            strokeWidth="1.25"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <g>
        <path
          d="M13.542 8.542H6.458a2.5 2.5 0 0 0-2.5 2.5v3.75a2.5 2.5 0 0 0 2.5 2.5h7.084a2.5 2.5 0 0 0 2.5-2.5v-3.75a2.5 2.5 0 0 0-2.5-2.5Z"
          stroke={color}
          strokeWidth="1.25"
        />
        <path
          d="M10 13.958a1.042 1.042 0 1 0 0-2.083 1.042 1.042 0 0 0 0 2.083Z"
          stroke={color}
          strokeWidth="1.25"
        />
        <mask
          id="UnlockedIcon"
          maskUnits="userSpaceOnUse"
          x="6"
          y="1"
          width="9"
          height="9"
          style={{ maskType: "alpha" }}
        >
          <path
            stroke="none"
            d="M6.399 9.561V5.175c0-.93.401-1.823 1.116-2.48a3.981 3.981 0 0 1 2.693-1.028c1.01 0 1.98.37 2.694 1.027.715.658 1.116 1.55 1.116 2.481"
            fill="#fff"
          />
        </mask>
        <g mask="url(#UnlockedIcon)">
          <path
            stroke="none"
            d="M5.149 9.561v1.25h2.5v-1.25h-2.5Zm5.06-7.894V.417v1.25Zm2.559 3.508v1.25h2.5v-1.25h-2.5ZM7.648 8.51V5.175h-2.5V8.51h2.5Zm0-3.334c0-.564.243-1.128.713-1.561L6.668 1.775c-.959.883-1.52 2.104-1.52 3.4h2.5Zm.713-1.561a2.732 2.732 0 0 1 1.847-.697v-2.5c-1.31 0-2.585.478-3.54 1.358L8.36 3.614Zm1.847-.697c.71 0 1.374.26 1.847.697l1.694-1.839a5.231 5.231 0 0 0-3.54-1.358v2.5Zm1.847.697c.47.433.713.997.713 1.561h2.5c0-1.296-.56-2.517-1.52-3.41l-1.693 1.839Z"
            fill="currentColor"
          />
        </g>
      </g>
    </svg>
  );
}
