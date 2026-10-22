/**
 * Database connection pool.
 *
 * In tests, DATABASE_URL_TEST is used.
 * In dev/prod, DATABASE_URL is used.
 */

import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
    const connectionString = isTest && process.env.DATABASE_URL_TEST
      ? process.env.DATABASE_URL_TEST
      : process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL or DATABASE_URL_TEST must be set");
    }

    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * Run a function inside a database transaction.
 * Automatically commits on success and rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close the pool (for clean shutdown in tests).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
