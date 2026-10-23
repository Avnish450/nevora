/**
 * Nevora Design & Motion Tokens
 * Follows the Nevora UI/UX Design Brief & Motion Spec.
 */

export const tokens = {
  colors: {
    light: {
      ink: "#0E0D17",
      paper: "#FAFAFC",
      surface: "#FFFFFF",
      line: "#E8E6F0",
      muted: "#6B697D",
      moss: "#7D00FF",      // MoonPay Electric Violet
      mossHover: "#6A00DB",
      mossText: "#FFFFFF",
      buy: "#00C278",
      sell: "#FF4365",
      amber: "#F59E0B",
      alert: "#EF4444",
      primary: "#7D00FF",
      primaryHover: "#6A00DB",
      primarySubtle: "#F4ECFF",
    },
    dark: {
      ink: "#F8F7FC",
      paper: "#08060F",
      surface: "#120E22",
      line: "#241D3B",
      muted: "#9E9BB3",
      moss: "#8F24FF",
      mossHover: "#7D00FF",
      mossText: "#FFFFFF",
      buy: "#10B981",
      sell: "#FF5A78",
      amber: "#FBBF24",
      alert: "#F87171",
      primary: "#8F24FF",
      primaryHover: "#7D00FF",
      primarySubtle: "rgba(125, 0, 255, 0.18)",
    },
  },

  radius: {
    input: "12px",
    card: "20px",
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
    sans: "var(--font-sans, 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    mono: "var(--font-mono, 'JetBrains Mono', monospace)",
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
