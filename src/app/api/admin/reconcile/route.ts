import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { reconcile } from "@/lib/services/ledger";
import { formatUsdt } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    if (user.role !== "admin") {
      return errorResponse("Admin access required", 403, "FORBIDDEN");
    }

    const discrepancies = await reconcile(client);

    // Also get accounts summary
    const { rows: accounts } = await client.query(`
      SELECT
        a.id,
        a.user_id,
        u.name as user_name,
        a.asset,
        a.kind,
        a.balance,
        COALESCE(SUM(le.amount), 0) AS computed_balance
      FROM accounts a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN ledger_entries le ON le.account_id = a.id
      GROUP BY a.id, u.name
      ORDER BY a.id ASC
    `);

    const formattedAccounts = accounts.map((a: Record<string, any>) => ({
      id: a.id,
      userName: a.user_name || "System",
      asset: a.asset,
      kind: a.kind,
      cachedBalance: formatUsdt(BigInt(a.balance)),
      computedBalance: formatUsdt(BigInt(a.computed_balance)),
      matches: a.balance === a.computed_balance,
    }));

    return jsonResponse({
      ok: discrepancies.length === 0,
      discrepancyCount: discrepancies.length,
      discrepancies: discrepancies.map((d) => ({
        accountId: d.accountId,
        cachedBalance: formatUsdt(d.cachedBalance),
        computedBalance: formatUsdt(d.computedBalance),
      })),
      accountsSummary: formattedAccounts,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
