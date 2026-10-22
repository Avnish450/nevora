/**
 * Application configuration.
 */

export const config = {
  /** Order expiry window in minutes */
  expiryMinutes: process.env.DEMO_MODE === "true" ? 2 : 15,

  /** Whether we're in demo mode */
  demoMode: process.env.DEMO_MODE === "true",
};
