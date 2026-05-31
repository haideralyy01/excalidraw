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
    <div style={styles.wrapper}>
      <label htmlFor={id} style={styles.label}>
        {label}
      </label>
      <div style={styles.inputContainer}>
        {icon && <span style={styles.iconLeft}>{icon}</span>}
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          style={{
            ...styles.input,
            paddingLeft: icon ? 44 : 16,
            paddingRight: isPassword ? 44 : 16,
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
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

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#9d9dab",
    letterSpacing: "0.02em",
    textTransform: "uppercase" as const,
  },
  inputContainer: {
    position: "relative",
    width: "100%",
  },
  iconLeft: {
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    color: "#6b6b7b",
  },
  input: {
    width: "100%",
    height: 50,
    background: "#1a1a22",
    border: "1.5px solid #2e2e38",
    borderRadius: 12,
    color: "#e4e4e7",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxSizing: "border-box" as const,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
};
