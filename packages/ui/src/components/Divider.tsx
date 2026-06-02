import React from "react";

interface DividerProps {
  text?: string;
}

export function Divider({ text }: DividerProps) {
  return (
    <div className="flex items-center gap-4 w-full my-1">
      <div className="flex-1 h-px bg-linear-to-r from-transparent via-[#2e2e38] to-transparent" />
      {text && (
        <span className="text-xs text-[#6b6b7b] tracking-[0.05em] uppercase whitespace-nowrap font-medium">
          {text}
        </span>
      )}
      <div className="flex-1 h-px bg-linear-to-r from-transparent via-[#2e2e38] to-transparent" />
    </div>
  );
}
