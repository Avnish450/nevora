import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { faucetCredit, getUserBalances } from "@/lib/services/ledger";
import { parseUsdt, formatUsdt } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function POST(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);

    let amount = 100_000_000n; // Default 100 USDT
    try {
      const body = await req.json();
      if (body.amount) {
        amount = parseUsdt(String(body.amount));
      }
    } catch {
      // Body is optional
    }

    if (amount <= 0n) {
      return errorResponse("Amount must be greater than zero", 400);
    }

    await client.query("BEGIN");
    const result = await faucetCredit(client, user.id, amount);
    await client.query("COMMIT");

    const balances = await getUserBalances(client, user.id);

    return jsonResponse({
      success: true,
      journalId: result.journalId,
      creditedUsdt: formatUsdt(amount),
      newBalances: {
        available: balances.available,
        locked: balances.locked,
        availableFormatted: formatUsdt(balances.available),
        lockedFormatted: formatUsdt(balances.locked),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
