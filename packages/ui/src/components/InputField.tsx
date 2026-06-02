"use client";

import React, { useState } from "react";
import { EyeIcon } from "../icons/EyeIcon";
import { EyeOffIcon } from "../icons/EyeOffIcon";

interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  required?: boolean;
  autoComplete?: string;
}

export function InputField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  required = false,
  autoComplete,
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-[#9d9dab] tracking-[0.02em] uppercase"
      >
        {label}
      </label>
      <div className="relative w-full">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none text-[#6b6b7b]">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className={`w-full h-[46px] bg-[#1a1a22] border-[1.5px] border-[#2e2e38] rounded-xl text-[#e4e4e7] text-[15px] outline-none transition-[border-color,box-shadow] duration-200 ease-in-out box-border ${icon ? "pl-11" : "pl-4"} ${isPassword ? "pr-11" : "pr-4"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer flex items-center justify-center p-1"
          >
            {showPassword ? (
              <EyeOffIcon size={18} color="#6b6b7b" />
            ) : (
              <EyeIcon size={18} color="#6b6b7b" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
