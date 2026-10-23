"use client";

import React from "react";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepTrackerProps {
  steps: Step[];
  currentStepIndex: number;
  isDisputed?: boolean;
  isCancelled?: boolean;
  isExpired?: boolean;
  className?: string;
}

export default function StepTracker({
  steps,
  currentStepIndex,
  isDisputed = false,
  isCancelled = false,
  isExpired = false,
  className = "",
}: StepTrackerProps) {
  return (
    <div className={`w-full py-4 ${className}`} aria-label="Trade Progress">
      <div className="flex items-center justify-between relative">
        {/* Background connector line */}
        <div className="absolute top-4 left-6 right-6 h-[2px] bg-line z-0" />

        {/* Animated fill line */}
        <div
          className="absolute top-4 left-6 h-[2px] bg-moss z-0"
          style={{
            width: `${Math.max(
              0,
              Math.min(100, (currentStepIndex / (steps.length - 1)) * 100)
            )}%`,
            transition: "width 300ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const isUpcoming = idx > currentStepIndex;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center flex-1 text-center"
            >
              {/* Step circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-colors duration-300 ${
                  isCompleted
                    ? "bg-moss text-white shadow-xs"
                    : isCurrent
                    ? isDisputed
                      ? "bg-amber text-black ring-4 ring-amber/20"
                      : isCancelled || isExpired
                      ? "bg-alert text-white"
                      : "bg-surface border-2 border-moss text-moss ring-4 ring-moss/10"
                    : "bg-surface border border-line text-muted"
                }`}
                style={{
                  transition: "all 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {isCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step labels */}
              <div className="mt-2 space-y-0.5">
                <span
                  className={`text-xs font-semibold block transition-colors ${
                    isCurrent
                      ? "text-ink"
                      : isCompleted
                      ? "text-moss font-medium"
                      : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[11px] text-muted hidden sm:block">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
