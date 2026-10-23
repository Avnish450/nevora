"use client";

import React from "react";

interface MarqueeRowProps {
  items?: string[];
  className?: string;
}

const DEFAULT_CHIPS = [
  "UPI Instant",
  "IMPS 24/7",
  "Bank Transfer (NEFT/RTGS)",
  "TRC20 (Tron)",
  "BEP20 (BNB Smart Chain)",
  "ERC20 (Ethereum)",
  "Zero Platform Fee",
  "100% Escrow Protection",
];

export default function MarqueeRow({
  items = DEFAULT_CHIPS,
  className = "",
}: MarqueeRowProps) {
  return (
    <div
      className={`overflow-hidden relative py-3 border-y border-line bg-surface/50 select-none ${className}`}
      aria-label="Supported payment methods and networks"
    >
      <div className="animate-marquee flex items-center gap-3">
        {/* Render twice for seamless continuous loop */}
        {[...items, ...items].map((chip, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3 py-1.5 rounded-tag bg-paper border border-line text-xs font-medium text-ink whitespace-nowrap shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-moss inline-block" />
            <span>{chip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
