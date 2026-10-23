"use client";

import React from "react";

interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
}

/**
 * AnimatedCheckmark - Signature calm success confirmation.
 * Draws its stroke in 400ms without confetti.
 */
export default function AnimatedCheckmark({
  size = 32,
  className = "",
}: AnimatedCheckmarkProps) {
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label="Success checkmark"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-buy"
      >
        <circle
          cx="16"
          cy="16"
          r="14"
          stroke="currentColor"
          strokeWidth="2"
          fill="currentColor"
          fillOpacity="0.12"
        />
        <path
          d="M9 16.5L14 21.5L23 11.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-check-draw"
        />
      </svg>
    </div>
  );
}
