import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getOrder,
  getOrderEvents,
  expireOverdueOrders,
} from "@/lib/services/orders";
import { getAd } from "@/lib/services/ads";
import { formatUsdtDisplay, formatInr } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (isNaN(orderId)) return errorResponse("Invalid order ID", 400);

  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);

    // Auto-expire overdue orders
    await client.query("BEGIN");
    await expireOverdueOrders(client);
    await client.query("COMMIT");

    const order = await getOrder(client, orderId);
    if (!order) return errorResponse("Order not found", 404);

    // Only buyer, seller, or admin can view order
    if (
      user.id !== order.buyerId &&
      user.id !== order.sellerId &&
      user.role !== "admin"
    ) {
      return errorResponse("Access denied", 403, "FORBIDDEN");
    }

    const events = await getOrderEvents(client, orderId);
    const ad = await getAd(client, order.adId);

    // Fetch buyer & seller names
    const { rows: users } = await client.query(
      `SELECT id, name, role FROM users WHERE id IN ($1, $2)`,
      [order.buyerId, order.sellerId]
    );
    const buyer = users.find((u: Record<string, any>) => u.id === order.buyerId);
    const seller = users.find((u: Record<string, any>) => u.id === order.sellerId);

    // Fetch dispute info if any
    const { rows: disputes } = await client.query(
      `SELECT d.*, u.name as opened_by_name
       FROM disputes d
       JOIN users u ON u.id = d.opened_by
       WHERE d.order_id = $1
       ORDER BY d.created_at DESC`,
      [orderId]
    );

    return jsonResponse({
      order: {
        ...order,
        usdtAmountFormatted: formatUsdtDisplay(order.usdtAmount),
        priceInrFormatted: formatInr(order.priceInrPaise),
        totalInrFormatted: formatInr(order.totalInrPaise),
        buyerName: buyer?.name || "Buyer",
        sellerName: seller?.name || "Seller",
      },
      ad: ad
        ? {
            ...ad,
            priceInrFormatted: formatInr(ad.priceInrPaise),
            totalUsdtFormatted: formatUsdtDisplay(ad.totalUsdt),
            remainingUsdtFormatted: formatUsdtDisplay(ad.remainingUsdt),
          }
        : null,
      events,
      dispute: disputes.length > 0 ? disputes[0] : null,
      currentUser: user,
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
