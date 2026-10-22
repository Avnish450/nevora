import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { markPaid } from "@/lib/services/orders";
import { jsonResponse, errorResponse } from "@/lib/json";

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

    await client.query("BEGIN");
    const order = await markPaid(client, orderId, user.id);
    await client.query("COMMIT");

    return jsonResponse({ success: true, order });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorResponse((err as Error).message, 400);
  } finally {
    client.release();
  }
}
