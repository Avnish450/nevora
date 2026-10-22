#!/usr/bin/env node

/**
 * Simple migration runner: applies .sql files from migrations/ in order.
 * Tracks applied migrations in a `_migrations` table.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts [--test]
 *
 * --test  uses DATABASE_URL_TEST instead of DATABASE_URL
 */

import { Pool } from "pg";
import fs from "fs";
import path from "path";
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
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Read migration files, sorted
    const migrationsDir = path.join(process.cwd(), "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.log("No migrations/ directory found.");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // Get already applied
    const { rows: applied } = await client.query(
      "SELECT name FROM _migrations"
    );
    const appliedSet = new Set(applied.map((r: { name: string }) => r.name));

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      console.log(`Applying ${file}...`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Failed to apply ${file}:`, err);
        process.exit(1);
      }
    }

    console.log(
      count > 0 ? `Applied ${count} migration(s).` : "All migrations up to date."
    );
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration runner failed:", err);
  process.exit(1);
});
