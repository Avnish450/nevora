"use client";

import React from "react";

interface ShimmerBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  dotColor?: string;
}

/**
 * Animmaster Lib — Shimmer Badge
 * Features an animated sweeping border beam and glowing background reflection.
 */
export default function ShimmerBadge({
  children,
  className = "",
  dotColor = "bg-purple-600",
  ...props
}: ShimmerBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold relative overflow-hidden group bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/50 text-purple-700 dark:text-purple-300 shadow-xs hover:border-purple-300 transition-colors ${className}`}
      {...props}
    >
      {/* Animated Shimmer Beam sweep */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full duration-1000 bg-gradient-to-r from-transparent via-purple-300/30 dark:via-purple-400/20 to-transparent transition-transform pointer-events-none" />

      {/* Pulsing signal dot */}
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>

      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </div>
  );
}
