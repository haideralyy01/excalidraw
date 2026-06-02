"use client";

import React from "react";

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
  const isPrimary = variant === "primary";

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? "w-full" : "w-auto"} h-[46px] rounded-xl text-[15px] font-semibold tracking-[0.03em] cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isPrimary ? "btn-primary" : "btn-ghost"}`}
    >
      {children}
    </button>
  );
}
