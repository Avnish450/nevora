"use client";

import React from "react";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Animmaster Lib — Aurora Background
 * Soft flowing ambient purple & white gradient mesh that creates a lively,
 * friendly, modern fintech visual depth.
 */
export default function AuroraBackground({
  children,
  className = "",
}: AuroraBackgroundProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Ambient background blur blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Blob 1: Soft Electric Violet */}
        <div
          className="absolute -top-[10%] left-[15%] w-[450px] h-[350px] rounded-full bg-purple-300/35 dark:bg-purple-700/20 blur-[90px] animate-[aurora-float_12s_ease-in-out_infinite_alternate]"
        />
        {/* Blob 2: Warm Lavender / Lilac */}
        <div
          className="absolute top-[20%] right-[10%] w-[400px] h-[300px] rounded-full bg-violet-200/45 dark:bg-violet-800/15 blur-[100px] animate-[aurora-float_14s_ease-in-out_infinite_alternate-reverse]"
        />
        {/* Blob 3: Soft Periwinkle accent */}
        <div
          className="absolute -bottom-[10%] left-[30%] w-[500px] h-[280px] rounded-full bg-indigo-200/30 dark:bg-indigo-900/15 blur-[110px] animate-[aurora-float_16s_ease-in-out_infinite_alternate]"
        />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}
