/**
 * Nevora Design & Motion Tokens
 * Follows the Nevora UI/UX Design Brief & Motion Spec.
 */

export const tokens = {
  colors: {
    light: {
      ink: "#14201C",
      paper: "#F6F3EC",
      surface: "#FFFFFF",
      line: "#DDD8CB",
      muted: "#6A736E",
      moss: "#1F5E4B",
      mossHover: "#164637",
      mossText: "#FFFFFF",
      buy: "#1F7A55",
      sell: "#B4492F",
      amber: "#C98A1B",
      alert: "#B3261E",
    },
    dark: {
      ink: "#EDEAE2",
      paper: "#0F1613",
      surface: "#17211D",
      line: "#2A3732",
      muted: "#93A09A",
      moss: "#4FA98A",
      mossHover: "#3E8D72",
      mossText: "#0F1613",
      buy: "#4FB58A",
      sell: "#E0775C",
      amber: "#E8B04A",
      alert: "#F0746C",
    },
  },

  radius: {
    input: "6px",
    card: "10px",
    pill: "9999px",
  },

  motion: {
    // Exact durations from spec: 120, 200, 300, 500ms
    duration: {
      fast: 120,       // button press, quick states
      base: 200,       // menu panel, number tween, countdown tick
      stepper: 300,    // step progress, carousel slide
      lock: 500,       // signature escrow padlock settle
      shimmer: 1200,   // skeleton loader loop
      marquee: 40000,  // chip row 40s linear loop
    },
    // Exact entrance easing: cubic-bezier(0.22, 1, 0.36, 1)
    easing: {
      entrance: "cubic-bezier(0.22, 1, 0.36, 1)",
      easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
      linear: "linear",
    },
    // Distance tokens: 8, 16, 24px
    distance: {
      sm: "8px",   // topbar scroll, menu rise
      md: "16px",  // scroll reveals
      lg: "24px",  // mobile menu drilldown
    },
    // Stagger token: 60ms
    stagger: 60,
  },

  typography: {
    sans: "var(--font-sans, 'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    mono: "var(--font-mono, 'IBM Plex Mono', monospace)",
  },
} as const;

/**
 * Format INR with Indian numbering system (e.g. 1,25,000.00).
 */
export function formatIndianInr(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format USDT with exact 2 decimal places and comma separators.
 */
export function formatUsdtDisplayString(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
