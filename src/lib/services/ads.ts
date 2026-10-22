import { PoolClient } from "pg";

export interface Ad {
  id: number;
  sellerId: number;
  sellerName?: string;
  priceInrPaise: bigint;
  totalUsdt: bigint;
  remainingUsdt: bigint;
  minUsdt: bigint;
  maxUsdt: bigint;
  paymentMethod: string;
  paymentDetails: string;
  status: "active" | "closed";
  createdAt: Date;
}

function mapAd(row: Record<string, unknown>): Ad {
  return {
    id: row.id as number,
    sellerId: row.seller_id as number,
    sellerName: row.seller_name as string | undefined,
    priceInrPaise: BigInt(row.price_inr_paise as string),
    totalUsdt: BigInt(row.total_usdt as string),
    remainingUsdt: BigInt(row.remaining_usdt as string),
    minUsdt: BigInt(row.min_usdt as string),
    maxUsdt: BigInt(row.max_usdt as string),
    paymentMethod: row.payment_method as string,
    paymentDetails: row.payment_details as string,
    status: row.status as "active" | "closed",
    createdAt: row.created_at as Date,
  };
}

export async function listActiveAds(client: PoolClient): Promise<Ad[]> {
  const { rows } = await client.query(`
    SELECT a.*, u.name as seller_name
    FROM ads a
    JOIN users u ON u.id = a.seller_id
    WHERE a.status = 'active' AND a.remaining_usdt > 0
    ORDER BY a.price_inr_paise ASC, a.created_at DESC
  `);
  return rows.map(mapAd);
}

export async function getAd(client: PoolClient, adId: number): Promise<Ad | null> {
  const { rows } = await client.query(`
    SELECT a.*, u.name as seller_name
    FROM ads a
    JOIN users u ON u.id = a.seller_id
    WHERE a.id = $1
  `, [adId]);
  return rows.length > 0 ? mapAd(rows[0]) : null;
}

export async function createAd(
  client: PoolClient,
  sellerId: number,
  data: {
    priceInrPaise: bigint;
    totalUsdt: bigint;
    minUsdt: bigint;
    maxUsdt: bigint;
    paymentMethod: string;
    paymentDetails: string;
  }
): Promise<Ad> {
  if (data.priceInrPaise <= BigInt(0)) throw new Error("Price must be greater than zero");
  if (data.totalUsdt <= BigInt(0)) throw new Error("Total USDT must be greater than zero");
  if (data.minUsdt <= BigInt(0)) throw new Error("Min USDT must be greater than zero");
  if (data.maxUsdt < data.minUsdt) throw new Error("Max USDT cannot be less than Min USDT");
  if (data.maxUsdt > data.totalUsdt) throw new Error("Max USDT cannot exceed Total USDT");
  if (!data.paymentMethod.trim()) throw new Error("Payment method is required");
  if (!data.paymentDetails.trim()) throw new Error("Payment details are required");

  const { rows } = await client.query(`
    INSERT INTO ads (seller_id, price_inr_paise, total_usdt, remaining_usdt, min_usdt, max_usdt, payment_method, payment_details)
    VALUES ($1, $2, $3, $3, $4, $5, $6, $7)
    RETURNING *
  `, [
    sellerId,
    data.priceInrPaise.toString(),
    data.totalUsdt.toString(),
    data.minUsdt.toString(),
    data.maxUsdt.toString(),
    data.paymentMethod.trim(),
    data.paymentDetails.trim(),
  ]);

  return mapAd(rows[0]);
}

export async function closeAd(
  client: PoolClient,
  adId: number,
  sellerId: number
): Promise<Ad> {
  const { rows } = await client.query(
    `SELECT * FROM ads WHERE id = $1 FOR UPDATE`,
    [adId]
  );
  if (rows.length === 0) throw new Error(`Ad ${adId} not found`);
  const ad = mapAd(rows[0]);

  if (ad.sellerId !== sellerId) {
    throw new Error("Only the seller can close this ad");
  }

  await client.query(
    `UPDATE ads SET status = 'closed' WHERE id = $1`,
    [adId]
  );

  return { ...ad, status: "closed" };
}
