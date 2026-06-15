"use client";

import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "default" | "primary" | "icon";
  id?: string;
  className?: string;
  ariaLabel?: string;
}

export function Button({
  children,
  onClick,
  variant = "default",
  id,
  className = "",
  ariaLabel,
}: ButtonProps) {
  const base =
    "flex items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition-colors duration-200";

  const variants: Record<string, string> = {
    default:
      "px-3 py-2 bg-[#2b2b2b] text-[#b4b4b4] hover:bg-[#a8a5ff] hover:text-[#121212] border border-[#3a3a3a]",
    primary:
      "px-4 py-2 bg-[#a8a5ff] hover:bg-[#b8b5ff] text-black",
    icon:
      "w-8 h-8 bg-[#2b2b2b] hover:bg-[#363636] text-[#b4b4b4] border border-[#3a3a3a]",
  };

  return (
    <button
      id={id}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}