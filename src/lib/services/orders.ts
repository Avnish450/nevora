/**
 * Order service — the state machine for P2P trades.
 *
 * Every state transition:
 * 1. Locks the order row with SELECT ... FOR UPDATE
 * 2. Validates the current state
 * 3. Applies ledger entries (if any)
 * 4. Updates the order state
 * 5. Writes an order_events audit record
 * All within one database transaction.
 *
 * Terminal states: RELEASED, CANCELLED, EXPIRED, RESOLVED_RELEASED, RESOLVED_REFUNDED
 */

import { PoolClient } from "pg";
import { lockFunds, unlockFunds, releaseFunds } from "./ledger";
import { calculateTotalInrPaise } from "../money";

const TERMINAL_STATES = new Set([
  "RELEASED",
  "CANCELLED",
  "EXPIRED",
  "RESOLVED_RELEASED",
  "RESOLVED_REFUNDED",
]);

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Order {
  id: number;
  adId: number;
  buyerId: number;
  sellerId: number;
  usdtAmount: bigint;
  priceInrPaise: bigint;
  totalInrPaise: bigint;
  state: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderEvent {
  id: number;
  orderId: number;
  fromState: string | null;
  toState: string;
  actorId: number | null;
  note: string | null;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function mapOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as number,
    adId: row.ad_id as number,
    buyerId: row.buyer_id as number,
    sellerId: row.seller_id as number,
    usdtAmount: BigInt(row.usdt_amount as string),
    priceInrPaise: BigInt(row.price_inr_paise as string),
    totalInrPaise: BigInt(row.total_inr_paise as string),
    state: row.state as string,
    expiresAt: row.expires_at as Date,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

/**
 * Lock and fetch the order row. Throws if not found.
 */
async function lockOrder(client: PoolClient, orderId: number): Promise<Order> {
  const { rows } = await client.query(
    `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
    [orderId]
  );
  if (rows.length === 0) {
    throw new Error(`Order ${orderId} not found`);
  }
  return mapOrder(rows[0]);
}

/**
 * Write an order event.
 */
async function writeEvent(
  client: PoolClient,
  orderId: number,
  fromState: string | null,
  toState: string,
  actorId: number | null,
  note: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO order_events (order_id, from_state, to_state, actor_id, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, fromState, toState, actorId, note]
  );
}

/**
 * Update order state and updated_at.
 */
async function updateOrderState(
  client: PoolClient,
  orderId: number,
  newState: string
): Promise<void> {
  await client.query(
    `UPDATE orders SET state = $1, updated_at = NOW() WHERE id = $2`,
    [newState, orderId]
  );
}

// ─────────────────────────────────────────────────────────────
// Create Order
// ─────────────────────────────────────────────────────────────

/**
 * Create a new order against an ad.
 *
 * Within one transaction:
 * 1. Lock the ad row
 * 2. Validate amount is within min/max and remaining
 * 3. Lock seller's USDT (ledger)
 * 4. Reduce ad's remaining_usdt
 * 5. Create the order
 * 6. Write the order event
 */
export async function createOrder(
  client: PoolClient,
  buyerId: number,
  adId: number,
  usdtAmount: bigint,
  expiryMinutes: number
): Promise<Order> {
  // Lock the ad
  const { rows: adRows } = await client.query(
    `SELECT * FROM ads WHERE id = $1 FOR UPDATE`,
    [adId]
  );
  if (adRows.length === 0) {
    throw new Error(`Ad ${adId} not found`);
  }
  const ad = adRows[0];

  if (ad.status !== "active") {
    throw new Error(`Ad ${adId} is not active`);
  }

  const sellerId = ad.seller_id as number;
  if (buyerId === sellerId) {
    throw new Error("Buyer and seller cannot be the same user");
  }

  const remainingUsdt = BigInt(ad.remaining_usdt);
  const minUsdt = BigInt(ad.min_usdt);
  const maxUsdt = BigInt(ad.max_usdt);

  if (usdtAmount < minUsdt) {
    throw new Error(
      `Amount ${usdtAmount} is below minimum ${minUsdt}`
    );
  }
  if (usdtAmount > maxUsdt) {
    throw new Error(
      `Amount ${usdtAmount} exceeds maximum ${maxUsdt}`
    );
  }
  if (usdtAmount > remainingUsdt) {
    throw new Error(
      `Amount ${usdtAmount} exceeds remaining ${remainingUsdt}`
    );
  }

  const priceInrPaise = BigInt(ad.price_inr_paise);
  const totalInrPaise = calculateTotalInrPaise(usdtAmount, priceInrPaise);

  // Lock seller's USDT
  const lockResult = await lockFunds(client, sellerId, usdtAmount, "order", 0);

  // Reduce ad's remaining
  await client.query(
    `UPDATE ads SET remaining_usdt = remaining_usdt - $1 WHERE id = $2`,
    [usdtAmount.toString(), adId]
  );

  // Create order
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const { rows: orderRows } = await client.query(
    `INSERT INTO orders (ad_id, buyer_id, seller_id, usdt_amount, price_inr_paise, total_inr_paise, state, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7)
     RETURNING *`,
    [adId, buyerId, sellerId, usdtAmount.toString(), priceInrPaise.toString(), totalInrPaise.toString(), expiresAt]
  );

  const order = mapOrder(orderRows[0]);

  // Update journal reference_id now that we have the order id
  await client.query(
    `UPDATE journals SET reference_id = $1 WHERE id = $2`,
    [order.id, lockResult.journalId]
  );

  // Write event
  await writeEvent(client, order.id, null, "CREATED", buyerId, null);

  return order;
}

// ─────────────────────────────────────────────────────────────
// Mark Paid (CREATED → PAID)
// ─────────────────────────────────────────────────────────────

export async function markPaid(
  client: PoolClient,
  orderId: number,
  buyerId: number
): Promise<Order> {
  const order = await lockOrder(client, orderId);

  if (order.state === "PAID") {
    // Idempotent: already paid
    return order;
  }

  if (order.state !== "CREATED") {
    throw new Error(
      `Cannot mark paid: order ${orderId} is in state ${order.state}, expected CREATED`
    );
  }

  if (order.buyerId !== buyerId) {
    throw new Error("Only the buyer can mark an order as paid");
  }

  await updateOrderState(client, orderId, "PAID");
  await writeEvent(client, orderId, "CREATED", "PAID", buyerId, null);

  return { ...order, state: "PAID" };
}

// ─────────────────────────────────────────────────────────────
// Release (PAID → RELEASED)
// ─────────────────────────────────────────────────────────────

export async function releaseOrder(
  client: PoolClient,
  orderId: number,
  sellerId: number
): Promise<Order> {
  const order = await lockOrder(client, orderId);

  if (order.state === "RELEASED") {
    // Idempotent: already released
    return order;
  }

  if (order.state !== "PAID") {
    throw new Error(
      `Cannot release: order ${orderId} is in state ${order.state}, expected PAID`
    );
  }

  if (order.sellerId !== sellerId) {
    throw new Error("Only the seller can release an order");
  }

  // Release funds: seller locked → buyer available
  await releaseFunds(
    client,
    order.sellerId,
    order.buyerId,
    order.usdtAmount,
    "order",
    orderId
  );

  await updateOrderState(client, orderId, "RELEASED");
  await writeEvent(client, orderId, "PAID", "RELEASED", sellerId, null);

  return { ...order, state: "RELEASED" };
}

// ─────────────────────────────────────────────────────────────
// Cancel (CREATED → CANCELLED)
// ─────────────────────────────────────────────────────────────

export async function cancelOrder(
  client: PoolClient,
  orderId: number,
  buyerId: number
): Promise<Order> {
  const order = await lockOrder(client, orderId);

  if (order.state === "CANCELLED") {
    return order;
  }

  if (order.state !== "CREATED") {
    throw new Error(
      `Cannot cancel: order ${orderId} is in state ${order.state}, expected CREATED`
    );
  }

  if (order.buyerId !== buyerId) {
    throw new Error("Only the buyer can cancel an order");
  }

  // Unlock funds: seller locked → seller available
  await unlockFunds(
    client,
    order.sellerId,
    order.usdtAmount,
    "order",
    orderId
  );

  // Restore ad's remaining amount
  await client.query(
    `UPDATE ads SET remaining_usdt = remaining_usdt + $1 WHERE id = $2`,
    [order.usdtAmount.toString(), order.adId]
  );

  await updateOrderState(client, orderId, "CANCELLED");
  await writeEvent(client, orderId, "CREATED", "CANCELLED", buyerId, null);

  return { ...order, state: "CANCELLED" };
}

// ─────────────────────────────────────────────────────────────
// Expire (CREATED → EXPIRED)
// ─────────────────────────────────────────────────────────────

export async function expireOrder(
  client: PoolClient,
  orderId: number
): Promise<Order> {
  const order = await lockOrder(client, orderId);

  if (order.state === "EXPIRED") {
    return order;
  }

  if (order.state !== "CREATED") {
    throw new Error(
      `Cannot expire: order ${orderId} is in state ${order.state}, expected CREATED`
    );
  }

  // Unlock funds
  await unlockFunds(
    client,
    order.sellerId,
    order.usdtAmount,
    "order",
    orderId
  );

  // Restore ad's remaining amount
  await client.query(
    `UPDATE ads SET remaining_usdt = remaining_usdt + $1 WHERE id = $2`,
    [order.usdtAmount.toString(), order.adId]
  );

  await updateOrderState(client, orderId, "EXPIRED");
  await writeEvent(client, orderId, "CREATED", "EXPIRED", null, "Order expired");

  return { ...order, state: "EXPIRED" };
}

/**
 * Expire all overdue CREATED orders.
 * Called periodically or on every read.
 */
export async function expireOverdueOrders(client: PoolClient): Promise<number> {
  const { rows } = await client.query(
    `SELECT id FROM orders WHERE state = 'CREATED' AND expires_at <= NOW()`
  );

  let count = 0;
  for (const row of rows) {
    try {
      await expireOrder(client, row.id);
      count++;
    } catch {
      // Already expired or state changed — skip
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────
// Dispute (PAID → DISPUTED)
// ─────────────────────────────────────────────────────────────

export async function disputeOrder(
  client: PoolClient,
  orderId: number,
  userId: number,
  reason: string
): Promise<Order> {
  const order = await lockOrder(client, orderId);

  if (order.state === "DISPUTED") {
    return order;
  }

  if (order.state !== "PAID") {
    throw new Error(
      `Cannot dispute: order ${orderId} is in state ${order.state}, expected PAID`
    );
  }

  if (userId !== order.buyerId && userId !== order.sellerId) {
    throw new Error("Only the buyer or seller can dispute an order");
  }

  // No ledger effect — funds stay locked

  // Create dispute record
  await client.query(
    `INSERT INTO disputes (order_id, opened_by, reason) VALUES ($1, $2, $3)`,
    [orderId, userId, reason]
  );

  await updateOrderState(client, orderId, "DISPUTED");
  await writeEvent(client, orderId, "PAID", "DISPUTED", userId, reason);

  return { ...order, state: "DISPUTED" };
}

// ─────────────────────────────────────────────────────────────
// Admin Resolve (DISPUTED → RESOLVED_RELEASED or RESOLVED_REFUNDED)
// ─────────────────────────────────────────────────────────────

export async function resolveDispute(
  client: PoolClient,
  orderId: number,
  adminId: number,
  favourBuyer: boolean
): Promise<Order> {
  const order = await lockOrder(client, orderId);

  const targetState = favourBuyer ? "RESOLVED_RELEASED" : "RESOLVED_REFUNDED";

  if (order.state === targetState) {
    return order;
  }

  if (order.state !== "DISPUTED") {
    throw new Error(
      `Cannot resolve: order ${orderId} is in state ${order.state}, expected DISPUTED`
    );
  }

  if (favourBuyer) {
    // Release to buyer
    await releaseFunds(
      client,
      order.sellerId,
      order.buyerId,
      order.usdtAmount,
      "order",
      orderId
    );
  } else {
    // Refund to seller
    await unlockFunds(
      client,
      order.sellerId,
      order.usdtAmount,
      "order",
      orderId
    );
  }

  // Update dispute record
  await client.query(
    `UPDATE disputes
     SET resolution = $1, resolved_by = $2, resolved_at = NOW()
     WHERE order_id = $3 AND resolution IS NULL`,
    [favourBuyer ? "released_to_buyer" : "refunded_to_seller", adminId, orderId]
  );

  await updateOrderState(client, orderId, targetState);
  await writeEvent(
    client,
    orderId,
    "DISPUTED",
    targetState,
    adminId,
    favourBuyer ? "Admin released to buyer" : "Admin refunded to seller"
  );

  return { ...order, state: targetState };
}

// ─────────────────────────────────────────────────────────────
// Query helpers
// ─────────────────────────────────────────────────────────────

export async function getOrder(
  client: PoolClient,
  orderId: number
): Promise<Order | null> {
  const { rows } = await client.query(
    `SELECT * FROM orders WHERE id = $1`,
    [orderId]
  );
  return rows.length > 0 ? mapOrder(rows[0]) : null;
}

export async function getOrderEvents(
  client: PoolClient,
  orderId: number
): Promise<OrderEvent[]> {
  const { rows } = await client.query(
    `SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at ASC, id ASC`,
    [orderId]
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    orderId: r.order_id as number,
    fromState: r.from_state as string | null,
    toState: r.to_state as string,
    actorId: r.actor_id as number | null,
    note: r.note as string | null,
    createdAt: r.created_at as Date,
  }));
}

export async function getOrdersByUser(
  client: PoolClient,
  userId: number
): Promise<Order[]> {
  const { rows } = await client.query(
    `SELECT * FROM orders WHERE buyer_id = $1 OR seller_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(mapOrder);
}
