import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatUsdtDisplay, formatInr } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    if (user.role !== "admin") {
      return errorResponse("Admin access required", 403, "FORBIDDEN");
    }

    const { rows } = await client.query(`
      SELECT
        d.id as dispute_id,
        d.order_id,
        d.opened_by,
        d.reason,
        d.resolution,
        d.resolved_by,
        d.resolved_at,
        d.created_at as dispute_created_at,
        o.state as order_state,
        o.usdt_amount,
        o.price_inr_paise,
        o.total_inr_paise,
        o.buyer_id,
        o.seller_id,
        u_open.name as opened_by_name,
        u_buyer.name as buyer_name,
        u_seller.name as seller_name
      FROM disputes d
      JOIN orders o ON o.id = d.order_id
      JOIN users u_open ON u_open.id = d.opened_by
      JOIN users u_buyer ON u_buyer.id = o.buyer_id
      JOIN users u_seller ON u_seller.id = o.seller_id
      ORDER BY d.created_at DESC
    `);

    const disputes = rows.map((r: Record<string, any>) => ({
      ...r,
      usdtAmountFormatted: formatUsdtDisplay(BigInt(r.usdt_amount)),
      priceInrFormatted: formatInr(BigInt(r.price_inr_paise)),
      totalInrFormatted: formatInr(BigInt(r.total_inr_paise)),
    }));

    return jsonResponse({ disputes });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
