/**
 * Test utilities for database tests.
 *
 * Provides setup/teardown for the test database:
 * - Resets the schema before tests
 * - Applies migrations
 * - Provides a clean pool for each test suite
 */

import { Pool, PoolClient } from "pg";
import fs from "fs";
import path from "path";

const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ||
  "postgres://localhost:5432/nevora_test";

let testPool: Pool | null = null;

export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({ connectionString: TEST_DB_URL });
  }
  return testPool;
}

/**
 * Reset the test database: drop all tables, re-apply migrations.
 */
export async function resetTestDb(): Promise<void> {
  const pool = getTestPool();
  const client = await pool.connect();

  try {
    // Drop and recreate schema
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO PUBLIC;
    `);

    // Apply all migrations
    const migrationsDir = path.join(process.cwd(), "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}

/**
 * Close the test pool. Call in afterAll().
 */
export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Seed a minimal set of users and accounts for testing.
 * Returns user IDs and account IDs.
 */
export async function seedTestData(client: PoolClient) {
  // Create users
  const { rows: users } = await client.query(`
    INSERT INTO users (name, role) VALUES
      ('Alice', 'seller'),
      ('Bob', 'buyer'),
      ('Admin', 'admin')
    RETURNING id, name, role
  `);

  const alice = users.find((u: { name: string }) => u.name === "Alice")!;
  const bob = users.find((u: { name: string }) => u.name === "Bob")!;
  const admin = users.find((u: { name: string }) => u.name === "Admin")!;

  // Create accounts
  const { rows: accounts } = await client.query(
    `
    INSERT INTO accounts (user_id, asset, kind, balance) VALUES
      ($1, 'USDT', 'available', 0),
      ($1, 'USDT', 'locked', 0),
      ($2, 'USDT', 'available', 0),
      ($2, 'USDT', 'locked', 0),
      ($3, 'USDT', 'available', 0),
      ($3, 'USDT', 'locked', 0),
      (NULL, 'USDT', 'system', 0)
    RETURNING id, user_id, kind
  `,
    [alice.id, bob.id, admin.id]
  );

  const findAccount = (userId: number | null, kind: string) =>
    accounts.find(
      (a: { user_id: number | null; kind: string }) =>
        a.user_id === userId && a.kind === kind
    )!;

  return {
    alice,
    bob,
    admin,
    accounts: {
      aliceAvailable: findAccount(alice.id, "available"),
      aliceLocked: findAccount(alice.id, "locked"),
      bobAvailable: findAccount(bob.id, "available"),
      bobLocked: findAccount(bob.id, "locked"),
      adminAvailable: findAccount(admin.id, "available"),
      adminLocked: findAccount(admin.id, "locked"),
      system: findAccount(null, "system"),
    },
  };
}
