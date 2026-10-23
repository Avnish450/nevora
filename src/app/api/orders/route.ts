import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  createOrder,
  getOrdersByUser,
  expireOverdueOrders,
} from "@/lib/services/orders";
import { parseUsdt, formatUsdtDisplay, formatInr } from "@/lib/money";
import { config } from "@/lib/config";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);

    // Auto-expire overdue orders on read
    await client.query("BEGIN");
    await expireOverdueOrders(client);
    await client.query("COMMIT");

    const orders = await getOrdersByUser(client, user.id);
    const formatted = orders.map((o) => ({
      ...o,
      usdtAmountFormatted: formatUsdtDisplay(o.usdtAmount),
      priceInrFormatted: formatInr(o.priceInrPaise),
      totalInrFormatted: formatInr(o.totalInrPaise),
    }));

    return jsonResponse({ orders: formatted });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    const body = await req.json();
    const { adId, usdtAmount } = body;

    if (!adId || !usdtAmount) {
      return errorResponse("adId and usdtAmount are required", 400);
    }

    const adIdNum = parseInt(String(adId), 10);
    const amountUnits = parseUsdt(String(usdtAmount));

    await client.query("BEGIN");
    const order = await createOrder(
      client,
      user.id,
      adIdNum,
      amountUnits,
      config.expiryMinutes
    );
    await client.query("COMMIT");

    return jsonResponse({
      success: true,
      order: {
        ...order,
        usdtAmountFormatted: formatUsdtDisplay(order.usdtAmount),
        priceInrFormatted: formatInr(order.priceInrPaise),
        totalInrFormatted: formatInr(order.totalInrPaise),
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorResponse((err as Error).message, 400);
  } finally {
    client.release();
  }
}
