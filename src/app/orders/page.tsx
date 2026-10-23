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
            className="inline-block mt-2 text-xs font-bold px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-full shadow-md shadow-purple-600/25 hover:shadow-lg hover:shadow-purple-600/35 active:scale-[0.98] transition-all"
          >
            Explore marketplace
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-[24px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-line text-muted uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Trade</th>
                  <th className="py-3.5 px-4">Side</th>
                  <th className="py-3.5 px-4">Crypto amount</th>
                  <th className="py-3.5 px-4">Unit rate</th>
                  <th className="py-3.5 px-4">Total payment</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((order) => {
                  const isBuyer = currentUser?.id === order.buyerId;
                  return (
                    <tr key={order.id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-ink">
                        #{order.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${
                            isBuyer
                              ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50"
                              : "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200/50"
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
                          className="px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200/60 dark:border-purple-800/60 text-xs font-bold text-purple-700 dark:text-purple-300 inline-block transition-colors"
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
