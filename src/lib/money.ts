/**
 * Money utilities.
 *
 * All amounts are stored as bigint in the smallest unit:
 * - USDT: 6 decimals → 1 USDT = 1_000_000 units
 * - INR:  2 decimals → 1 INR  = 100 paise
 *
 * Never use floating point for money.
 */

/** 1 USDT in smallest units (micro-USDT) */
export const USDT_DECIMALS = 6;
export const ONE_USDT = BigInt(10 ** USDT_DECIMALS); // 1_000_000n

/** 1 INR in paise */
export const INR_DECIMALS = 2;
export const ONE_INR = BigInt(10 ** INR_DECIMALS); // 100n

export const ZERO_BIGINT = BigInt(0);

/**
 * Calculate order total in paise (rounded down).
 *
 * Formula: total_inr_paise = usdt_amount × price_inr_paise ÷ ONE_USDT
 *
 * This is the single source of truth for this calculation.
 * Uses bigint division which truncates (rounds toward zero = floor for positives).
 */
export function calculateTotalInrPaise(
  usdtAmount: bigint,
  priceInrPaise: bigint
): bigint {
  if (usdtAmount <= ZERO_BIGINT) {
    throw new Error("USDT amount must be positive");
  }
  if (priceInrPaise <= ZERO_BIGINT) {
    throw new Error("Price must be positive");
  }
  return (usdtAmount * priceInrPaise) / ONE_USDT;
}

/**
 * Format Indian digit grouping (e.g., 1234567 -> 12,34,567).
 */
export function formatIndianGrouping(wholeStr: string): string {
  if (wholeStr.length <= 3) return wholeStr;
  const lastThree = wholeStr.slice(-3);
  const remaining = wholeStr.slice(0, -3);
  const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${lastThree}`;
}

/**
 * Format USDT from smallest units to a human-readable string.
 * Full precision (6 decimals).
 * e.g., 1.5 USDT → "1.500000"
 */
export function formatUsdt(units: bigint): string {
  const isNegative = units < ZERO_BIGINT;
  const abs = isNegative ? -units : units;
  const whole = abs / ONE_USDT;
  const frac = abs % ONE_USDT;
  const fracStr = frac.toString().padStart(USDT_DECIMALS, "0");
  return `${isNegative ? "-" : ""}${formatIndianGrouping(whole.toString())}.${fracStr}`;
}

/**
 * Format USDT for standard interface display (2 decimals, e.g. 100.00).
 */
export function formatUsdtDisplay(units: bigint): string {
  const isNegative = units < ZERO_BIGINT;
  const abs = isNegative ? -units : units;
  const whole = abs / ONE_USDT;
  const frac = abs % ONE_USDT;
  // Two decimal digits
  const twoDec = (frac / BigInt(10_000)).toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${formatIndianGrouping(whole.toString())}.${twoDec}`;
}

/**
 * Format INR from paise to a human-readable string with Indian digit grouping.
 * e.g., 880000 paise → "₹8,800.00"
 */
export function formatInr(paise: bigint): string {
  const isNegative = paise < ZERO_BIGINT;
  const abs = isNegative ? -paise : paise;
  const whole = abs / ONE_INR;
  const frac = abs % ONE_INR;
  const fracStr = frac.toString().padStart(INR_DECIMALS, "0");
  const groupedWhole = formatIndianGrouping(whole.toString());
  return `${isNegative ? "-" : ""}${groupedWhole}.${fracStr}`;
}

/**
 * Parse a USDT string like "100" or "10.5" into smallest units.
 */
export function parseUsdt(str: string): bigint {
  const parts = str.split(".");
  const whole = BigInt(parts[0]) * ONE_USDT;
  if (parts.length === 1) return whole;
  const fracStr = parts[1].padEnd(USDT_DECIMALS, "0").slice(0, USDT_DECIMALS);
  return whole + BigInt(fracStr);
}

/**
 * Parse an INR string like "88" or "88.50" into paise.
 */
export function parseInr(str: string): bigint {
  const parts = str.split(".");
  const whole = BigInt(parts[0]) * ONE_INR;
  if (parts.length === 1) return whole;
  const fracStr = parts[1].padEnd(INR_DECIMALS, "0").slice(0, INR_DECIMALS);
  return whole + BigInt(fracStr);
}
