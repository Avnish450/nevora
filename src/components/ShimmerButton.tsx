"use client";

import React from "react";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
}

/**
 * Animmaster Lib — Shimmer Button
 * Dynamic interactive button with continuous subtle ambient shimmer,
 * tactile spring click, and vivid purple glow shadow.
 */
export default function ShimmerButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: ShimmerButtonProps) {
  const baseStyles =
    "relative inline-flex items-center justify-center gap-2 rounded-full font-semibold text-sm transition-all duration-200 overflow-hidden active:scale-[0.98] select-none cursor-pointer";

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 text-white shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/35 hover:-translate-y-0.5 border border-purple-400/30",
    secondary:
      "bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-xs",
    outline:
      "bg-white/80 hover:bg-purple-50 text-slate-800 dark:bg-[#151024] dark:hover:bg-[#1E1734] dark:text-slate-100 border border-purple-200/80 dark:border-purple-800/60 shadow-xs",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* Animated continuous sheen effect */}
      {variant === "primary" && (
        <span className="absolute inset-0 block h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] animate-[shimmer-sweep_3.5s_infinite_ease-in-out] pointer-events-none" />
      )}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
