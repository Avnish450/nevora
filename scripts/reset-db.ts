#!/usr/bin/env node

/**
 * Reset database: drops all tables and re-runs migrations.
 * Usage: npx tsx scripts/reset-db.ts [--test]
 */

import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const isTest = process.argv.includes("--test");
const connString = isTest
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

if (!connString) {
  console.error(
    `Missing ${isTest ? "DATABASE_URL_TEST" : "DATABASE_URL"} in .env.local`
  );
  process.exit(1);
}

async function run() {
  const pool = new Pool({ connectionString: connString });
  const client = await pool.connect();

  try {
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO PUBLIC;
    `);
    console.log("Database reset.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
