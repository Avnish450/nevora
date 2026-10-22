import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrder } from "@/lib/services/orders";
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
    const order = await getOrder(client, orderId);
    if (!order) return errorResponse("Order not found", 404);

    if (
      user.id !== order.buyerId &&
      user.id !== order.sellerId &&
      user.role !== "admin"
    ) {
      return errorResponse("Access denied", 403, "FORBIDDEN");
    }

    const { rows } = await client.query(
      `SELECT m.id, m.order_id, m.sender_id, m.body, m.created_at, u.name as sender_name
       FROM chat_messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.order_id = $1
       ORDER BY m.created_at ASC`,
      [orderId]
    );

    return jsonResponse({ messages: rows });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}

export async function POST(
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
    const order = await getOrder(client, orderId);
    if (!order) return errorResponse("Order not found", 404);

    if (
      user.id !== order.buyerId &&
      user.id !== order.sellerId &&
      user.role !== "admin"
    ) {
      return errorResponse("Access denied", 403, "FORBIDDEN");
    }

    const body = await req.json();
    const text = body.body?.trim();
    if (!text) return errorResponse("Message cannot be empty", 400);

    const { rows } = await client.query(
      `INSERT INTO chat_messages (order_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, order_id, sender_id, body, created_at`,
      [orderId, user.id, text]
    );

    return jsonResponse({
      success: true,
      message: { ...rows[0], sender_name: user.name },
    });
  } catch (err) {
    return errorResponse((err as Error).message, 500);
  } finally {
    client.release();
  }
}
