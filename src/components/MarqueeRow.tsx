"use client";

import React from "react";

interface MarqueeRowProps {
  items?: string[];
  className?: string;
}

interface ChipItem {
  label: string;
  badge?: string;
  icon?: string;
}

const DEFAULT_CHIPS: ChipItem[] = [
  { label: "UPI Instant", badge: "0% Fee" },
  { label: "Google Pay", badge: "Instant" },
  { label: "PhonePe", badge: "Direct" },
  { label: "Paytm UPI", badge: "Live" },
  { label: "IMPS 24/7", badge: "Instant" },
  { label: "Bank Transfer (RTGS)", badge: "High Limit" },
  { label: "Tether USDT (TRC20)", badge: "Fast" },
  { label: "USDT (BEP20)", badge: "Low Fee" },
  { label: "USDT (ERC20)", badge: "Ethereum" },
  { label: "100% Escrow Protected", badge: "Audited" },
];

export default function MarqueeRow({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden relative py-4 border-y border-line bg-surface-subtle/60 select-none backdrop-blur-xs ${className}`}
      aria-label="Supported payment methods and networks"
    >
      <div className="animate-marquee flex items-center gap-3 w-max">
        {/* Render twice for seamless continuous loop */}
        {[...DEFAULT_CHIPS, ...DEFAULT_CHIPS].map((chip, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-line text-xs font-semibold text-ink whitespace-nowrap shadow-xs hover:border-[#7D00FF]/50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-[#7D00FF] inline-block shadow-xs shadow-purple-500/50" />
            <span>{chip.label}</span>
            {chip.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#7D00FF] font-medium border border-purple-200/50 dark:border-purple-800/40">
                {chip.badge}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
