import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { listActiveAds, createAd } from "@/lib/services/ads";
import { parseInr, parseUsdt, formatInr, formatUsdtDisplay } from "@/lib/money";
import { jsonResponse, errorResponse } from "@/lib/json";

export async function GET() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const ads = await listActiveAds(client);
    const formatted = ads.map((ad) => ({
      ...ad,
      priceInr: formatInr(ad.priceInrPaise),
      totalUsdtFormatted: formatUsdtDisplay(ad.totalUsdt),
      remainingUsdtFormatted: formatUsdtDisplay(ad.remainingUsdt),
      minUsdtFormatted: formatUsdtDisplay(ad.minUsdt),
      maxUsdtFormatted: formatUsdtDisplay(ad.maxUsdt),
    }));
    return jsonResponse({ ads: formatted });
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
    if (user.role !== "seller" && user.role !== "admin") {
      return errorResponse("Only sellers can create ads", 403, "FORBIDDEN");
    }

    const body = await req.json();
    const { priceInr, totalUsdt, minUsdt, maxUsdt, paymentMethod, paymentDetails } = body;

    if (!priceInr || !totalUsdt || !minUsdt || !maxUsdt || !paymentMethod || !paymentDetails) {
      return errorResponse("All fields are required", 400);
    }

    const priceInrPaise = parseInr(String(priceInr));
    const totalUsdtUnits = parseUsdt(String(totalUsdt));
    const minUsdtUnits = parseUsdt(String(minUsdt));
    const maxUsdtUnits = parseUsdt(String(maxUsdt));

    await client.query("BEGIN");
    const ad = await createAd(client, user.id, {
      priceInrPaise,
      totalUsdt: totalUsdtUnits,
      minUsdt: minUsdtUnits,
      maxUsdt: maxUsdtUnits,
      paymentMethod,
      paymentDetails,
    });
    await client.query("COMMIT");

    return jsonResponse({ success: true, ad });
  } catch (err) {
    await client.query("ROLLBACK");
    return errorResponse((err as Error).message, 400);
  } finally {
    client.release();
  }
}
