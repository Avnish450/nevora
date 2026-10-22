import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { closeAd } from "@/lib/services/ads";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adId = parseInt(id, 10);
  if (isNaN(adId)) return errorResponse("Invalid ad ID", 400);

  const pool = getPool();
  const client = await pool.connect();
  try {
    const user = await getCurrentUser(client, req);
    await client.query("BEGIN");
    const ad = await closeAd(client, adId, user.id);
    await client.query("COMMIT");

    return jsonResponse({ success: true, ad });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorResponse((err as Error).message, 400);
  } finally {
    client.release();
  }
}
