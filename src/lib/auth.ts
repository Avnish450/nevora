import { NextRequest } from "next/server";
import { PoolClient } from "pg";

export interface CurrentUser {
  id: number;
  name: string;
  role: "seller" | "buyer" | "admin";
}

/**
 * Get current demo user from header 'x-user-id' or cookie 'nevora_user_id'.
 * Defaults to Alice (id: 1) if unspecified.
 */
export async function getCurrentUser(
  client: PoolClient,
  req: NextRequest
): Promise<CurrentUser> {
  const headerId = req.headers.get("x-user-id");
  const cookieId = req.cookies.get("nevora_user_id")?.value;
  const userIdStr = headerId || cookieId || "1";
  const userId = parseInt(userIdStr, 10);

  const { rows } = await client.query(
    `SELECT id, name, role FROM users WHERE id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    // Fallback to first user
    const { rows: firstUser } = await client.query(
      `SELECT id, name, role FROM users ORDER BY id ASC LIMIT 1`
    );
    if (firstUser.length === 0) {
      throw new Error("No users found in database");
    }
    return firstUser[0];
  }

  return rows[0];
}
