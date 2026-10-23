"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface ToastMessage {
  id: string;
  text: string;
  type?: "info" | "success" | "error";
}

interface ToastContextType {
  showToast: (text: string, type?: "info" | "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: "info" | "success" | "error" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto p-3 rounded-card bg-surface border border-line shadow-md text-xs font-medium text-ink flex items-center justify-between gap-3 animate-fade-up"
            style={{
              animation: "fadeUp 200ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  toast.type === "success"
                    ? "bg-buy"
                    : toast.type === "error"
                    ? "bg-alert"
                    : "bg-moss"
                }`}
              />
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-muted hover:text-ink text-xs p-1"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
