import React from "react";

/**
 * StatusBadge – renders an order state as a compact, colour-coded pill.
 * Follows the Nevora design brief palette:
 *   - green (buy/moss) for completed states
 *   - amber for in-progress
 *   - alert (red) for disputes/errors
 *   - muted for cancelled/expired
 */

const stateConfig: Record<string, { label: string; className: string }> = {
  CREATED: {
    label: "Awaiting payment",
    className: "text-amber bg-amber/10 border-amber/20",
  },
  PAID: {
    label: "Payment sent",
    className: "text-buy bg-buy/10 border-buy/20",
  },
  RELEASED: {
    label: "Completed",
    className: "text-moss bg-moss/10 border-moss/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "text-muted bg-paper border-line",
  },
  EXPIRED: {
    label: "Expired",
    className: "text-muted bg-paper border-line",
  },
  DISPUTED: {
    label: "Disputed",
    className: "text-alert bg-alert/10 border-alert/20",
  },
  RESOLVED_RELEASED: {
    label: "Resolved — released",
    className: "text-moss bg-moss/10 border-moss/20",
  },
  RESOLVED_REFUNDED: {
    label: "Resolved — refunded",
    className: "text-sell bg-sell/10 border-sell/20",
  },
};

export default function StatusBadge({ state }: { state: string }) {
  const config = stateConfig[state] ?? {
    label: state,
    className: "text-muted bg-paper border-line",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-tag border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
