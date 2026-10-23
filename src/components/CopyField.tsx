"use client";

import React, { useState } from "react";

interface CopyFieldProps {
  label?: string;
  value: string;
  displayValue?: string;
  className?: string;
  showFullValue?: boolean;
}

export default function CopyField({
  label,
  value,
  displayValue,
  className = "",
  showFullValue = true,
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <span className="text-[11px] font-medium text-muted block uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-input bg-paper border border-line">
        <span
          className={`font-mono text-xs text-ink select-all ${
            showFullValue ? "break-all" : "truncate"
          }`}
        >
          {displayValue || value}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-input border border-line bg-surface text-[11px] font-medium text-ink hover:bg-paper transition-colors btn-press"
          aria-label={copied ? "Copied to clipboard" : `Copy ${label || "value"}`}
        >
          {copied ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-buy"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-buy font-semibold">Copied</span>
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
