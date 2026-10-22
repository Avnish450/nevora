#!/usr/bin/env node

/**
 * Seed the database with demo users, accounts, a faucet credit, and an example ad.
 *
 * Usage: npx tsx scripts/seed.ts
 */

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connString = process.env.DATABASE_URL;
if (!connString) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

async function run() {
  const pool = new Pool({ connectionString: connString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ── Users ──
    const { rows: users } = await client.query(`
      INSERT INTO users (name, role) VALUES
        ('Alice', 'seller'),
        ('Bob', 'buyer'),
        ('Admin', 'admin')
      ON CONFLICT DO NOTHING
      RETURNING id, name, role
    `);

    if (users.length === 0) {
      console.log("Seed data already exists. Skipping.");
      await client.query("COMMIT");
      return;
    }

    const alice = users.find((u: { name: string }) => u.name === "Alice")!;
    const bob = users.find((u: { name: string }) => u.name === "Bob")!;
    const admin = users.find((u: { name: string }) => u.name === "Admin")!;

    console.log(`Created users: Alice(${alice.id}), Bob(${bob.id}), Admin(${admin.id})`);

    // ── Accounts ──
    // Each user gets available and locked accounts for USDT
    // Plus one system account
    const { rows: accounts } = await client.query(`
      INSERT INTO accounts (user_id, asset, kind, balance) VALUES
        ($1, 'USDT', 'available', 0),
        ($1, 'USDT', 'locked', 0),
        ($2, 'USDT', 'available', 0),
        ($2, 'USDT', 'locked', 0),
        ($3, 'USDT', 'available', 0),
        ($3, 'USDT', 'locked', 0),
        (NULL, 'USDT', 'system', 0)
      RETURNING id, user_id, kind
    `, [alice.id, bob.id, admin.id]);

    const aliceAvailable = accounts.find(
      (a: { user_id: number; kind: string }) => a.user_id === alice.id && a.kind === "available"
    )!;
    const systemAccount = accounts.find(
      (a: { user_id: number | null; kind: string }) => a.user_id === null && a.kind === "system"
    )!;

    // ── Faucet credit: 1,000 USDT to Alice ──
    const faucetAmount = BigInt(1_000_000_000); // 1,000 USDT in micro-USDT

    const { rows: [journal] } = await client.query(`
      INSERT INTO journals (type, reference_type) VALUES ('faucet', 'seed')
      RETURNING id
    `);

    await client.query(`
      INSERT INTO ledger_entries (journal_id, account_id, amount) VALUES
        ($1, $2, $3),
        ($1, $4, $5)
    `, [
      journal.id,
      systemAccount.id, -faucetAmount,
      aliceAvailable.id, faucetAmount,
    ]);

    // Update cached balances
    await client.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [
      faucetAmount, aliceAvailable.id,
    ]);
    await client.query(`UPDATE accounts SET balance = $1 WHERE id = $2`, [
      -faucetAmount, systemAccount.id,
    ]);

    console.log("Credited 1,000 USDT to Alice via faucet");

    // ── Example ad from Alice ──
    // Price: 88.00 INR/USDT = 8800 paise
    // Total: 500 USDT = 500_000_000 micro-USDT
    // Min: 10 USDT, Max: 500 USDT
    await client.query(`
      INSERT INTO ads (seller_id, price_inr_paise, total_usdt, remaining_usdt, min_usdt, max_usdt, payment_method, payment_details)
      VALUES ($1, 8800, 500000000, 500000000, 10000000, 500000000, 'UPI', 'alice@upi')
    `, [alice.id]);

    console.log("Created example ad from Alice: 88.00 INR/USDT, 10-500 USDT, UPI");

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
