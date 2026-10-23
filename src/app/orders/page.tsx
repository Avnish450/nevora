"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import StatusBadge from "@/components/StatusBadge";
import { SkeletonTable } from "@/components/Skeleton";

interface OrderItem {
  id: number;
  adId: number;
  buyerId: number;
  sellerId: number;
  usdtAmountFormatted: string;
  priceInrFormatted: string;
  totalInrFormatted: string;
  state: string;
  createdAt: string;
}

export default function MyOrdersPage() {
  const { currentUser, fetchWithUser } = useUser();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithUser("/api/orders");
      if (!res.ok) throw new Error("Failed to load your orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fetchWithUser]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="space-y-6 max-w-[1120px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">My Trades</h1>
          <p className="text-sm text-muted">
            All trades where you are the buyer or seller.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="text-xs px-3 py-1.5 rounded-input border border-line bg-surface text-muted hover:text-ink font-medium"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-paper border border-alert/30 rounded-input text-xs text-alert">
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={3} cols={6} />
      ) : orders.length === 0 ? (
        <div className="p-8 text-center bg-surface border border-line rounded-card space-y-3">
          <p className="text-sm font-medium text-ink">No trades yet</p>
          <p className="text-xs text-muted">
            When you open a buy order or a user buys from your ad, the trade will appear here.
          </p>
          <Link
            href="/marketplace"
            className="inline-block mt-2 text-xs font-semibold px-4 py-2 bg-moss rounded-input"
          >
            Explore marketplace
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper border-b border-line text-muted uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Trade</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Crypto amount</th>
                  <th className="py-3 px-4">Unit rate</th>
                  <th className="py-3 px-4">Total payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => {
                  const isBuyer = currentUser?.id === order.buyerId;
                  return (
                    <tr key={order.id} className="hover:bg-paper/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-ink">
                        #{order.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-tag border ${
                            isBuyer
                              ? "text-buy bg-buy/10 border-buy/20"
                              : "text-sell bg-sell/10 border-sell/20"
                          }`}
                        >
                          {isBuyer ? "Buy" : "Sell"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-ink tabular-nums">
                        {order.usdtAmountFormatted} USDT
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted tabular-nums">
                        ₹{order.priceInrFormatted}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-ink tabular-nums">
                        ₹{order.totalInrFormatted}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge state={order.state} />
                      </td>
                      <td className="py-3.5 px-4 text-muted text-[11px] tabular-nums">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="px-3 py-1.5 rounded-input bg-paper hover:bg-surface border border-line text-xs font-medium text-ink inline-block"
                        >
                          View trade →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
