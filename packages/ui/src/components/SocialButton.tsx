import React from "react";

interface SocialButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  id?: string;
}

export function SocialButton({ children, onClick, icon, id }: SocialButtonProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className="flex-1 h-[42px] rounded-xl border-[1.5px] border-[#2e2e38] bg-[#1a1a22] text-[#e4e4e7] text-[13px] font-medium cursor-pointer transition-all duration-200 ease-in-out flex items-center justify-center gap-2 hover:bg-[rgba(168,165,255,0.05)] hover:border-[#3e3e4a]"
    >
      {icon}
      {children}
    </button>
  );
}
