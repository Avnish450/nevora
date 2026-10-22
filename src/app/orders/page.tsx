"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";

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
      if (!res.ok) throw new Error("Failed to load orders");
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

  const getStateBadge = (state: string) => {
    switch (state) {
      case "CREATED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "PAID":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "RELEASED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "CANCELLED":
      case "EXPIRED":
        return "bg-slate-700/30 text-slate-400 border-slate-700/50";
      case "DISPUTED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "RESOLVED_RELEASED":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "RESOLVED_REFUNDED":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My P2P Trades</h1>
          <p className="text-sm text-slate-400">
            Orders where you are the buyer or seller ({currentUser?.name})
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading your orders...</div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <p className="text-slate-400">You don&apos;t have any orders yet.</p>
          <Link
            href="/"
            className="inline-block text-xs font-semibold px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg hover:bg-emerald-400 transition"
          >
            Go to Marketplace
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">USDT Amount</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Total INR</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((order) => {
                  const isBuyer = currentUser?.id === order.buyerId;
                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 font-mono font-medium text-white">
                        #{order.id}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-semibold ${
                            isBuyer
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {isBuyer ? "Buyer" : "Seller"}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-white">
                        {order.usdtAmountFormatted} USDT
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-300">
                        ₹{order.priceInrFormatted}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                        ₹{order.totalInrFormatted}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${getStateBadge(
                            order.state
                          )}`}
                        >
                          {order.state}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition inline-block"
                        >
                          View Trade →
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
