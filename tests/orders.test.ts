/**
 * Order State Machine tests.
 *
 * Requirements tested:
 * 3. Two buyers racing for the same seller's balance: only the orders that fit succeed.
 * 4. Releasing the same order twice moves funds once.
 * 5. Cancel after release, release after cancel, and release after expiry are all rejected.
 * 6. Expiry unlocks the seller's USDT and restores the ad's remaining amount.
 * 7. A dispute keeps funds locked, and each admin resolution moves funds correctly.
 * 8. A simulated failure midway through a release rolls everything back.
 * 10. Reconciliation passes after every scenario.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestPool, resetTestDb, closeTestPool, seedTestData } from "./setup";
import {
  faucetCredit,
  getUserBalances,
  reconcile,
} from "@/lib/services/ledger";
import {
  createOrder,
  markPaid,
  releaseOrder,
  cancelOrder,
  expireOrder,
  expireOverdueOrders,
  disputeOrder,
  resolveDispute,
  getOrder,
  getOrderEvents,
} from "@/lib/services/orders";

describe("Order State Machine", () => {
  const pool = getTestPool();

  beforeAll(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testData: Awaited<ReturnType<typeof seedTestData>>;

  // Helper to create an ad
  async function createTestAd(
    sellerId: number,
    totalUsdt: bigint,
    priceInrPaise: bigint = 8800n,
    minUsdt: bigint = 10_000_000n, // 10 USDT
    maxUsdt?: bigint
  ) {
    const effectiveMax = maxUsdt ?? totalUsdt;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO ads (seller_id, price_inr_paise, total_usdt, remaining_usdt, min_usdt, max_usdt, payment_method, payment_details)
         VALUES ($1, $2, $3, $3, $4, $5, 'UPI', 'seller@upi')
         RETURNING *`,
        [sellerId, priceInrPaise.toString(), totalUsdt.toString(), minUsdt.toString(), effectiveMax.toString()]
      );
      return rows[0];
    } finally {
      client.release();
    }
  }

  beforeEach(async () => {
    await resetTestDb();
    const client = await pool.connect();
    try {
      testData = await seedTestData(client);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 3: Two buyers racing for the same seller's balance
  // ───────────────────────────────────────────────────────────────
  it("two buyers racing for the same seller's balance: only the orders that fit succeed", async () => {
    const client = await pool.connect();
    try {
      // Alice has 100 USDT available
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    // Alice creates an ad for 100 USDT
    const ad = await createTestAd(
      testData.alice.id,
      100_000_000n,
      8800n,
      10_000_000n,
      100_000_000n
    );

    // Create a 3rd user as second buyer (Charlie)
    const client3 = await pool.connect();
    let charlieId: number;
    try {
      const { rows: [charlie] } = await client3.query(
        `INSERT INTO users (name, role) VALUES ('Charlie', 'buyer') RETURNING id`
      );
      charlieId = charlie.id;
      await client3.query(
        `INSERT INTO accounts (user_id, asset, kind, balance) VALUES
         ($1, 'USDT', 'available', 0),
         ($1, 'USDT', 'locked', 0)`,
        [charlieId]
      );
    } finally {
      client3.release();
    }

    // Both Bob and Charlie try to buy 80 USDT concurrently (total 160 > 100)
    const tryBuy = async (buyerId: number) => {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const order = await createOrder(c, buyerId, ad.id, 80_000_000n, 15);
        await c.query("COMMIT");
        return { success: true, order };
      } catch (err: unknown) {
        await c.query("ROLLBACK");
        return { success: false, error: (err as Error).message };
      } finally {
        c.release();
      }
    };

    const results = await Promise.all([
      tryBuy(testData.bob.id),
      tryBuy(charlieId),
    ]);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // Verify balances
    const verifyClient = await pool.connect();
    try {
      const aliceBal = await getUserBalances(verifyClient, testData.alice.id);
      expect(aliceBal.available).toBe(20_000_000n); // 100 - 80 = 20
      expect(aliceBal.locked).toBe(80_000_000n);

      const disc = await reconcile(verifyClient);
      expect(disc).toHaveLength(0);
    } finally {
      verifyClient.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 4 (Order level): Releasing the same order twice moves funds once
  // ───────────────────────────────────────────────────────────────
  it("releasing the same order twice moves funds once", async () => {
    const client = await pool.connect();
    try {
      // Alice has 200 USDT
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 200_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 200_000_000n);

      // Bob creates order for 50 USDT
      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 50_000_000n, 15);
      await client.query("COMMIT");

      // Bob marks paid
      await client.query("BEGIN");
      await markPaid(client, order.id, testData.bob.id);
      await client.query("COMMIT");

      // Alice releases order 1st time
      await client.query("BEGIN");
      const firstRelease = await releaseOrder(client, order.id, testData.alice.id);
      await client.query("COMMIT");
      expect(firstRelease.state).toBe("RELEASED");

      const bobBalAfterFirst = await getUserBalances(client, testData.bob.id);
      expect(bobBalAfterFirst.available).toBe(50_000_000n);

      // Alice releases order 2nd time (idempotent call)
      await client.query("BEGIN");
      const secondRelease = await releaseOrder(client, order.id, testData.alice.id);
      await client.query("COMMIT");
      expect(secondRelease.state).toBe("RELEASED");

      // Bob's balance must NOT increase again
      const bobBalAfterSecond = await getUserBalances(client, testData.bob.id);
      expect(bobBalAfterSecond.available).toBe(50_000_000n);

      const aliceBal = await getUserBalances(client, testData.alice.id);
      expect(aliceBal.available).toBe(150_000_000n);
      expect(aliceBal.locked).toBe(0n);

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 5: Cancel after release, release after cancel, release after expiry rejected
  // ───────────────────────────────────────────────────────────────
  it("cancel after release is rejected", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 50_000_000n, 15);
      await markPaid(client, order.id, testData.bob.id);
      await releaseOrder(client, order.id, testData.alice.id);
      await client.query("COMMIT");

      // Now try to cancel
      await client.query("BEGIN");
      await expect(
        cancelOrder(client, order.id, testData.bob.id)
      ).rejects.toThrow(/Cannot cancel.*RELEASED/);
      await client.query("ROLLBACK");

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it("release after cancel is rejected", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 50_000_000n, 15);
      await cancelOrder(client, order.id, testData.bob.id);
      await client.query("COMMIT");

      // Now try to release
      await client.query("BEGIN");
      await expect(
        releaseOrder(client, order.id, testData.alice.id)
      ).rejects.toThrow(/Cannot release.*CANCELLED/);
      await client.query("ROLLBACK");

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it("release after expiry is rejected", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 50_000_000n, 15);
      await expireOrder(client, order.id);
      await client.query("COMMIT");

      // Now try to release
      await client.query("BEGIN");
      await expect(
        releaseOrder(client, order.id, testData.alice.id)
      ).rejects.toThrow(/Cannot release.*EXPIRED/);
      await client.query("ROLLBACK");

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 6: Expiry unlocks the seller's USDT and restores ad's remaining amount
  // ───────────────────────────────────────────────────────────────
  it("expiry unlocks the seller's USDT and restores ad's remaining amount", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 60_000_000n, 15);
      await client.query("COMMIT");

      // Ad remaining should now be 40
      const { rows: adBeforeExpire } = await client.query(
        "SELECT remaining_usdt FROM ads WHERE id = $1",
        [ad.id]
      );
      expect(BigInt(adBeforeExpire[0].remaining_usdt)).toBe(40_000_000n);

      // Alice has 40 available, 60 locked
      const aliceBeforeExpire = await getUserBalances(client, testData.alice.id);
      expect(aliceBeforeExpire.available).toBe(40_000_000n);
      expect(aliceBeforeExpire.locked).toBe(60_000_000n);

      // Expire order
      await client.query("BEGIN");
      await expireOrder(client, order.id);
      await client.query("COMMIT");

      // Alice should have 100 available, 0 locked
      const aliceAfterExpire = await getUserBalances(client, testData.alice.id);
      expect(aliceAfterExpire.available).toBe(100_000_000n);
      expect(aliceAfterExpire.locked).toBe(0n);

      // Ad remaining restored to 100
      const { rows: adAfterExpire } = await client.query(
        "SELECT remaining_usdt FROM ads WHERE id = $1",
        [ad.id]
      );
      expect(BigInt(adAfterExpire[0].remaining_usdt)).toBe(100_000_000n);

      // Events audited
      const events = await getOrderEvents(client, order.id);
      expect(events.map((e) => e.toState)).toEqual(["CREATED", "EXPIRED"]);

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it("expireOverdueOrders automatically expires overdue orders", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      // Create order that expires in past (-5 minutes)
      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 30_000_000n, -5);
      await client.query("COMMIT");

      // Run overdue expiration
      const expiredCount = await expireOverdueOrders(client);
      expect(expiredCount).toBe(1);

      const refreshed = await getOrder(client, order.id);
      expect(refreshed?.state).toBe("EXPIRED");

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 7: Dispute keeps funds locked, each admin resolution moves funds correctly
  // ───────────────────────────────────────────────────────────────
  it("dispute keeps funds locked, and resolving for buyer releases to buyer", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 40_000_000n, 15);
      await markPaid(client, order.id, testData.bob.id);
      // Buyer opens dispute
      await disputeOrder(client, order.id, testData.bob.id, "Seller didn't release after payment");
      await client.query("COMMIT");

      // Funds must still be locked: Alice 40 locked, Bob 0 available
      const aliceDuringDispute = await getUserBalances(client, testData.alice.id);
      expect(aliceDuringDispute.locked).toBe(40_000_000n);
      const bobDuringDispute = await getUserBalances(client, testData.bob.id);
      expect(bobDuringDispute.available).toBe(0n);

      // Admin resolves favoring buyer
      await client.query("BEGIN");
      await resolveDispute(client, order.id, testData.admin.id, true);
      await client.query("COMMIT");

      const orderAfterResolve = await getOrder(client, order.id);
      expect(orderAfterResolve?.state).toBe("RESOLVED_RELEASED");

      const bobFinal = await getUserBalances(client, testData.bob.id);
      expect(bobFinal.available).toBe(40_000_000n);

      const aliceFinal = await getUserBalances(client, testData.alice.id);
      expect(aliceFinal.locked).toBe(0n);
      expect(aliceFinal.available).toBe(60_000_000n);

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it("dispute keeps funds locked, and resolving for seller refunds to seller", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 40_000_000n, 15);
      await markPaid(client, order.id, testData.bob.id);
      // Seller opens dispute
      await disputeOrder(client, order.id, testData.alice.id, "No payment received in UPI");
      await client.query("COMMIT");

      // Admin resolves favoring seller
      await client.query("BEGIN");
      await resolveDispute(client, order.id, testData.admin.id, false);
      await client.query("COMMIT");

      const orderAfterResolve = await getOrder(client, order.id);
      expect(orderAfterResolve?.state).toBe("RESOLVED_REFUNDED");

      const bobFinal = await getUserBalances(client, testData.bob.id);
      expect(bobFinal.available).toBe(0n);

      const aliceFinal = await getUserBalances(client, testData.alice.id);
      expect(aliceFinal.locked).toBe(0n);
      expect(aliceFinal.available).toBe(100_000_000n); // refunded back to Alice

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 8: Simulated failure midway through a release rolls everything back
  // ───────────────────────────────────────────────────────────────
  it("simulated failure midway through a release rolls everything back", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      const ad = await createTestAd(testData.alice.id, 100_000_000n);

      await client.query("BEGIN");
      const order = await createOrder(client, testData.bob.id, ad.id, 50_000_000n, 15);
      await markPaid(client, order.id, testData.bob.id);
      await client.query("COMMIT");

      // Attempt release with intentional crash halfway through
      await expect(
        (async () => {
          const c = await pool.connect();
          try {
            await c.query("BEGIN");
            await releaseOrder(c, order.id, testData.alice.id);
            // Simulate crash/error before commit
            throw new Error("Simulated network/DB crash after ledger update");
          } catch (err) {
            await c.query("ROLLBACK");
            throw err;
          } finally {
            c.release();
          }
        })()
      ).rejects.toThrow("Simulated network/DB crash after ledger update");

      // Verify that state is still PAID, not RELEASED
      const orderAfterRollback = await getOrder(client, order.id);
      expect(orderAfterRollback?.state).toBe("PAID");

      // Verify balances are unchanged (Alice still has 50 locked, Bob has 0)
      const aliceBal = await getUserBalances(client, testData.alice.id);
      expect(aliceBal.available).toBe(50_000_000n);
      expect(aliceBal.locked).toBe(50_000_000n);

      const bobBal = await getUserBalances(client, testData.bob.id);
      expect(bobBal.available).toBe(0n);

      // Verify no orphaned release events
      const events = await getOrderEvents(client, order.id);
      expect(events.map((e) => e.toState)).toEqual(["CREATED", "PAID"]);

      const disc = await reconcile(client);
      expect(disc).toHaveLength(0);
    } finally {
      client.release();
    }
  });
});
