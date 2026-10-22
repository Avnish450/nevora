import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getUserBalances } from "@/lib/services/ledger";
import { formatUsdt } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    const balances = await getUserBalances(client, user.id);

    return jsonResponse({
      user,
      balances: {
        available: balances.available,
        locked: balances.locked,
        availableFormatted: formatUsdt(balances.available),
        lockedFormatted: formatUsdt(balances.locked),
      },
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
