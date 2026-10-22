import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, name, role FROM users ORDER BY id ASC`
    );
    return jsonResponse({ users: rows });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
