import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { resolveDispute } from "@/lib/services/orders";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return errorResponse("Invalid ID", 400);

  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    if (user.role !== "admin") {
      return errorResponse("Only admin can resolve disputes", 403, "FORBIDDEN");
    }

    const body = await req.json();
    const favourBuyer =
      body.favourBuyer === true ||
      body.resolution === "buyer" ||
      body.resolution === "released_to_buyer";

    // Lookup order_id whether passed dispute ID or order ID
    const { rows: disputeRows } = await client.query(
      `SELECT order_id FROM disputes WHERE id = $1`,
      [idNum]
    );
    const orderId = disputeRows.length > 0 ? disputeRows[0].order_id : idNum;

    await client.query("BEGIN");
    const order = await resolveDispute(client, orderId, user.id, favourBuyer);
    await client.query("COMMIT");

    return jsonResponse({
      success: true,
      order,
      resolution: favourBuyer ? "released_to_buyer" : "refunded_to_seller",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorResponse((err as Error).message, 400);
  } finally {
    client.release();
  }
}
