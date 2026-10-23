"use client";

import React from "react";

interface AnimatedPadlockProps {
  isLocked: boolean;
  size?: number;
  className?: string;
}

/**
 * AnimatedPadlock - Nevora's signature escrow visual moment.
 * Closes with a small settle when USDT is locked in escrow,
 * opens smoothly when seller releases funds.
 * Degrades to an instant icon swap when prefers-reduced-motion is active.
 */
export default function AnimatedPadlock({
  isLocked,
  size = 28,
  className = "",
}: AnimatedPadlockProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={isLocked ? "Escrow locked" : "Escrow released"}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={isLocked ? "animate-lock-settle text-amber" : "text-buy"}
      >
        {/* Shackle */}
        <path
          d={
            isLocked
              ? "M7 11V7a5 5 0 0 1 10 0v4"
              : "M7 9V7a5 5 0 0 1 10 0v1"
          }
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: "d 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
            transformOrigin: "7px 11px",
          }}
        />
        {/* Body */}
        <rect
          x="4"
          y="11"
          width="16"
          height="11"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
          fill="currentColor"
          fillOpacity={isLocked ? "0.15" : "0.1"}
        />
        {/* Keyhole */}
        <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        <path
          d="M12 17.5V19.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
