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
 * Format USDT from smallest units to a human-readable string.
 * e.g., 1.5 USDT → "1.500000"
 */
export function formatUsdt(units: bigint): string {
  const isNegative = units < ZERO_BIGINT;
  const abs = isNegative ? -units : units;
  const whole = abs / ONE_USDT;
  const frac = abs % ONE_USDT;
  const fracStr = frac.toString().padStart(USDT_DECIMALS, "0");
  return `${isNegative ? "-" : ""}${whole}.${fracStr}`;
}

/**
 * Format INR from paise to a human-readable string.
 * e.g., 8800 paise → "88.00"
 */
export function formatInr(paise: bigint): string {
  const isNegative = paise < ZERO_BIGINT;
  const abs = isNegative ? -paise : paise;
  const whole = abs / ONE_INR;
  const frac = abs % ONE_INR;
  const fracStr = frac.toString().padStart(INR_DECIMALS, "0");
  return `${isNegative ? "-" : ""}${whole}.${fracStr}`;
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
