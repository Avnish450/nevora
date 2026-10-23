"use client";

import React, { useState } from "react";

const STEPS = [
  {
    number: "01",
    title: "Choose an ad & lock escrow",
    desc: "Browse live offers, pick your preferred price, and enter the amount. The seller's USDT is immediately locked safely in Nevora escrow before you transfer any INR.",
    tag: "Escrow safety net",
  },
  {
    number: "02",
    title: "Pay the seller directly",
    desc: "Send the exact INR amount using UPI or IMPS using the seller's verified payment details. No intermediaries touch your Indian rupees.",
    tag: "Direct peer-to-peer",
  },
  {
    number: "03",
    title: "Mark paid & notify seller",
    desc: "Click 'I have paid' to confirm your transfer. The seller receives instant notification to verify the incoming funds on their bank app.",
    tag: "Locked protection",
  },
  {
    number: "04",
    title: "USDT lands in your wallet",
    desc: "Once the seller confirms receipt, Nevora automatically releases the locked USDT directly into your available balance.",
    tag: "Instant settlement",
  },
];

export default function StepperCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const next = () => setActiveIndex((i) => Math.min(STEPS.length - 1, i + 1));

  return (
    <div className="space-y-6">
      {/* Stepper Progress Bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="flex-1 h-1.5 rounded-full overflow-hidden bg-line focus:outline-none"
          >
            <div
              className={`h-full bg-moss transition-all duration-300 ${
                i <= activeIndex ? "w-full" : "w-0"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Slide Presentation */}
      <div className="bg-surface border border-line rounded-card p-6 sm:p-8 min-h-[220px] flex flex-col justify-between relative shadow-xs">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-tag bg-paper border border-line text-moss">
              Step {STEPS[activeIndex].number} of 04
            </span>
            <span className="text-[11px] font-medium text-muted bg-paper px-2 py-0.5 rounded-tag">
              {STEPS[activeIndex].tag}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight text-ink">
              {STEPS[activeIndex].title}
            </h3>
            <p className="text-sm text-muted leading-relaxed max-w-2xl">
              {STEPS[activeIndex].desc}
            </p>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="flex items-center justify-between pt-6 border-t border-line mt-6">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                aria-label={`Jump to step ${i + 1}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === activeIndex ? "bg-moss" : "bg-line"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={activeIndex === 0}
              className="p-2 rounded-input border border-line bg-paper text-ink disabled:opacity-30 hover:bg-surface transition-colors btn-press"
              aria-label="Previous step"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={next}
              disabled={activeIndex === STEPS.length - 1}
              className="p-2 rounded-input border border-line bg-paper text-ink disabled:opacity-30 hover:bg-surface transition-colors btn-press"
              aria-label="Next step"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
