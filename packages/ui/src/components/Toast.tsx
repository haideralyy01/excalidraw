"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface Toast {
  id: string;
  message: string;
  type?: "join" | "leave" | "info";
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  join: {
    bg: "rgba(107, 207, 127, 0.12)",
    border: "1px solid rgba(107, 207, 127, 0.3)",
    icon: "🟢",
  },
  leave: {
    bg: "rgba(245, 165, 165, 0.12)",
    border: "1px solid rgba(245, 165, 165, 0.3)",
    icon: "🔴",
  },
  info: {
    bg: "rgba(168, 165, 255, 0.12)",
    border: "1px solid rgba(168, 165, 255, 0.3)",
    icon: "ℹ️",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const style = typeStyles[toast.type || "info"] || typeStyles.info!;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm text-[#e0e0e5] backdrop-blur-md shadow-lg"
      style={{
        background: style.bg,
        border: style.border,
        animation: "toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <span className="text-xs">{style.icon}</span>
      <span>{toast.message}</span>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/**
 * React hook for managing toasts.
 * Returns [toasts, addToast, dismissToast].
 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast } as const;
}
