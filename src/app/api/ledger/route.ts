import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getUserLedgerEntries } from "@/lib/services/ledger";
import { formatUsdt } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    const url = new URL(req.url);
    const viewAll = url.searchParams.get("all") === "true" && user.role === "admin";

    if (viewAll) {
      // Admin global ledger view
      const { rows } = await client.query(`
        SELECT
          le.id,
          le.journal_id,
          j.type AS journal_type,
          j.reference_type,
          j.reference_id,
          a.kind AS account_kind,
          a.asset,
          a.user_id,
          u.name AS user_name,
          le.amount,
          le.created_at
        FROM ledger_entries le
        JOIN accounts a ON a.id = le.account_id
        JOIN journals j ON j.id = le.journal_id
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY le.created_at DESC, le.id DESC
        LIMIT 100
      `);

      const formatted = rows.map((r: Record<string, any>) => ({
        id: r.id,
        journalId: r.journal_id,
        journalType: r.journal_type,
        referenceType: r.reference_type,
        referenceId: r.reference_id,
        accountKind: r.account_kind,
        asset: r.asset,
        userName: r.user_name || "System",
        amount: BigInt(r.amount),
        amountFormatted: formatUsdt(BigInt(r.amount)),
        createdAt: r.created_at,
      }));

      return jsonResponse({ entries: formatted, isGlobal: true });
    }

    const entries = await getUserLedgerEntries(client, user.id);
    const formatted = entries.map((e) => ({
      ...e,
      amountFormatted: formatUsdt(e.amount),
    }));

    return jsonResponse({ entries: formatted, isGlobal: false });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
