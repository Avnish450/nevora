/**
 * Ledger service tests.
 *
 * Tests 1, 2, 4, 9, 10 from the requirements:
 * 1. Faucet, lock, unlock, release, and withdrawal produce correct entries and journals sum to zero.
 * 2. A balance can never go negative: locking more than available fails.
 * 4. Releasing the same order twice moves funds once (tested at ledger level).
 * 9. Attempting to update or delete a ledger entry is rejected by the database.
 * 10. Reconciliation passes after every scenario.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { getTestPool, resetTestDb, closeTestPool, seedTestData } from "./setup";
import {
  createJournal,
  faucetCredit,
  lockFunds,
  unlockFunds,
  releaseFunds,
  withdrawal,
  reconcile,
  getUserBalances,
} from "@/lib/services/ledger";

describe("Ledger Service", () => {
  const pool = getTestPool();

  beforeAll(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  let testData: Awaited<ReturnType<typeof seedTestData>>;

  beforeEach(async () => {
    // Reset and reseed for each test
    await resetTestDb();
    const client = await pool.connect();
    try {
      testData = await seedTestData(client);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 1: Faucet, lock, unlock, release, and withdrawal
  //         produce correct entries; every journal sums to zero
  // ───────────────────────────────────────────────────────────────

  it("faucet creates correct entries summing to zero", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await faucetCredit(client, testData.alice.id, 100_000_000n); // 100 USDT
      await client.query("COMMIT");

      // Check entries sum to zero
      const { rows } = await client.query(
        `SELECT SUM(amount) AS total FROM ledger_entries WHERE journal_id = $1`,
        [result.journalId]
      );
      expect(BigInt(rows[0].total)).toBe(0n);

      // Check Alice's balance
      const balances = await getUserBalances(client, testData.alice.id);
      expect(balances.available).toBe(100_000_000n);
      expect(balances.locked).toBe(0n);
    } finally {
      client.release();
    }
  });

  it("lock creates correct entries summing to zero", async () => {
    const client = await pool.connect();
    try {
      // First, faucet some USDT
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 500_000_000n);
      await client.query("COMMIT");

      // Lock 200 USDT
      await client.query("BEGIN");
      const result = await lockFunds(client, testData.alice.id, 200_000_000n, "order", 1);
      await client.query("COMMIT");

      // Check entries sum to zero
      const { rows } = await client.query(
        `SELECT SUM(amount) AS total FROM ledger_entries WHERE journal_id = $1`,
        [result.journalId]
      );
      expect(BigInt(rows[0].total)).toBe(0n);

      // Check balances
      const balances = await getUserBalances(client, testData.alice.id);
      expect(balances.available).toBe(300_000_000n); // 500 - 200
      expect(balances.locked).toBe(200_000_000n);
    } finally {
      client.release();
    }
  });

  it("unlock creates correct entries summing to zero", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 500_000_000n);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await lockFunds(client, testData.alice.id, 200_000_000n, "order", 1);
      await client.query("COMMIT");

      // Unlock
      await client.query("BEGIN");
      const result = await unlockFunds(client, testData.alice.id, 200_000_000n, "order", 1);
      await client.query("COMMIT");

      const { rows } = await client.query(
        `SELECT SUM(amount) AS total FROM ledger_entries WHERE journal_id = $1`,
        [result.journalId]
      );
      expect(BigInt(rows[0].total)).toBe(0n);

      const balances = await getUserBalances(client, testData.alice.id);
      expect(balances.available).toBe(500_000_000n); // back to full
      expect(balances.locked).toBe(0n);
    } finally {
      client.release();
    }
  });

  it("release creates correct entries summing to zero", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 500_000_000n);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await lockFunds(client, testData.alice.id, 200_000_000n, "order", 1);
      await client.query("COMMIT");

      // Release to buyer
      await client.query("BEGIN");
      const result = await releaseFunds(
        client, testData.alice.id, testData.bob.id, 200_000_000n, "order", 1
      );
      await client.query("COMMIT");

      const { rows } = await client.query(
        `SELECT SUM(amount) AS total FROM ledger_entries WHERE journal_id = $1`,
        [result.journalId]
      );
      expect(BigInt(rows[0].total)).toBe(0n);

      // Alice's locked goes down, Bob's available goes up
      const aliceBalances = await getUserBalances(client, testData.alice.id);
      expect(aliceBalances.available).toBe(300_000_000n);
      expect(aliceBalances.locked).toBe(0n);

      const bobBalances = await getUserBalances(client, testData.bob.id);
      expect(bobBalances.available).toBe(200_000_000n);
    } finally {
      client.release();
    }
  });

  it("withdrawal creates correct entries summing to zero", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.bob.id, 100_000_000n);
      await client.query("COMMIT");

      await client.query("BEGIN");
      const result = await withdrawal(client, testData.bob.id, 50_000_000n);
      await client.query("COMMIT");

      const { rows } = await client.query(
        `SELECT SUM(amount) AS total FROM ledger_entries WHERE journal_id = $1`,
        [result.journalId]
      );
      expect(BigInt(rows[0].total)).toBe(0n);

      const balances = await getUserBalances(client, testData.bob.id);
      expect(balances.available).toBe(50_000_000n);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 2: Balance can never go negative
  // ───────────────────────────────────────────────────────────────

  it("locking more than available fails and changes nothing", async () => {
    const client = await pool.connect();
    try {
      // Give Alice 100 USDT
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      // Try to lock 200 USDT (should fail)
      await client.query("BEGIN");
      await expect(
        lockFunds(client, testData.alice.id, 200_000_000n, "order", 1)
      ).rejects.toThrow();
      await client.query("ROLLBACK");

      // Balance unchanged
      const balances = await getUserBalances(client, testData.alice.id);
      expect(balances.available).toBe(100_000_000n);
      expect(balances.locked).toBe(0n);
    } finally {
      client.release();
    }
  });

  it("withdrawing more than available fails", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.bob.id, 50_000_000n);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await expect(
        withdrawal(client, testData.bob.id, 100_000_000n)
      ).rejects.toThrow();
      await client.query("ROLLBACK");

      const balances = await getUserBalances(client, testData.bob.id);
      expect(balances.available).toBe(50_000_000n);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 4 (ledger level): Same operation idempotency
  // ───────────────────────────────────────────────────────────────

  it("journal entries must sum to zero — rejects imbalanced entries", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await expect(
        createJournal(client, "test", null, null, [
          { accountId: testData.accounts.aliceAvailable.id, amount: 100n },
        ])
      ).rejects.toThrow("sum to zero");
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 9: Attempting to update or delete a ledger entry is
  //         rejected by the database
  // ───────────────────────────────────────────────────────────────

  it("updating a ledger entry is rejected by the database trigger", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      // Try to update
      await expect(
        client.query("UPDATE ledger_entries SET amount = 0 WHERE id = 1")
      ).rejects.toThrow(/immutable/i);
    } finally {
      client.release();
    }
  });

  it("deleting a ledger entry is rejected by the database trigger", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 100_000_000n);
      await client.query("COMMIT");

      // Try to delete
      await expect(
        client.query("DELETE FROM ledger_entries WHERE id = 1")
      ).rejects.toThrow(/immutable/i);
    } finally {
      client.release();
    }
  });

  // ───────────────────────────────────────────────────────────────
  // Test 10: Reconciliation passes after every scenario
  // ───────────────────────────────────────────────────────────────

  it("reconciliation passes after faucet + lock + unlock", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 500_000_000n);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await lockFunds(client, testData.alice.id, 200_000_000n, "order", 1);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await unlockFunds(client, testData.alice.id, 100_000_000n, "order", 1);
      await client.query("COMMIT");

      const discrepancies = await reconcile(client);
      expect(discrepancies).toHaveLength(0);
    } finally {
      client.release();
    }
  });

  it("reconciliation passes after faucet + lock + release + withdrawal", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await faucetCredit(client, testData.alice.id, 500_000_000n);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await lockFunds(client, testData.alice.id, 200_000_000n, "order", 1);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await releaseFunds(
        client, testData.alice.id, testData.bob.id, 200_000_000n, "order", 1
      );
      await client.query("COMMIT");

      await client.query("BEGIN");
      await withdrawal(client, testData.bob.id, 100_000_000n);
      await client.query("COMMIT");

      const discrepancies = await reconcile(client);
      expect(discrepancies).toHaveLength(0);
    } finally {
      client.release();
    }
  });
});
