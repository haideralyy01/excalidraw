"use client";

import React, { useState } from "react";

interface SocialButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  id?: string;
}

export function SocialButton({ children, onClick, icon, id }: SocialButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const buttonStyle: React.CSSProperties = {
    flex: 1,
    height: 46,
    borderRadius: 12,
    border: "1.5px solid #2e2e38",
    background: isHovered ? "rgba(168, 165, 255, 0.05)" : "#1a1a22",
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderColor: isHovered ? "#3e3e4a" : "#2e2e38",
  };

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon}
      {children}
    </button>
  );
}
