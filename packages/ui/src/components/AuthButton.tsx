"use client";

import React, { useState } from "react";

interface AuthButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
  disabled?: boolean;
  id?: string;
}

export function AuthButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  fullWidth = true,
  disabled = false,
  id,
}: AuthButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const isPrimary = variant === "primary";

  const buttonStyle: React.CSSProperties = {
    width: fullWidth ? "100%" : "auto",
    height: 50,
    borderRadius: 12,
    border: isPrimary ? "none" : "1.5px solid #2e2e38",
    background: isPrimary
      ? isPressed
        ? "linear-gradient(135deg, #8a87e0 0%, #6e6bc4 100%)"
        : isHovered
          ? "linear-gradient(135deg, #b5b3ff 0%, #9290e0 100%)"
          : "linear-gradient(135deg, #a8a5ff 0%, #7b78d9 100%)"
      : isHovered
        ? "rgba(168, 165, 255, 0.08)"
        : "transparent",
    color: isPrimary ? "#121212" : "#a8a5ff",
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.03em",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: isPrimary && isHovered && !isPressed
      ? "0 8px 30px rgba(168, 165, 255, 0.3)"
      : "none",
    transform: isPressed ? "scale(0.98)" : "scale(1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {children}
    </button>
  );
}
