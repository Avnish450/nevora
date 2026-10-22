"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useUser } from "@/context/UserContext";
import Link from "next/link";

interface OrderDetail {
  id: number;
  adId: number;
  buyerId: number;
  sellerId: number;
  usdtAmountFormatted: string;
  priceInrFormatted: string;
  totalInrFormatted: string;
  state: string;
  expiresAt: string;
  createdAt: string;
  buyerName: string;
  sellerName: string;
}

interface OrderAd {
  paymentMethod: string;
  paymentDetails: string;
}

interface OrderEvent {
  id: number;
  fromState: string | null;
  toState: string;
  actorId: number | null;
  note: string | null;
  createdAt: string;
}

interface DisputeInfo {
  id: number;
  openedBy: number;
  opened_by_name: string;
  reason: string;
  resolution: string | null;
}

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  created_at: string;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { currentUser, fetchWithUser, refreshUser } = useUser();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [ad, setAd] = useState<OrderAd | null>(null);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [dispute, setDispute] = useState<DisputeInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<string>("");

  const fetchOrderData = useCallback(async () => {
    try {
      const res = await fetchWithUser(`/api/orders/${id}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to load order");
      }
      const data = await res.json();
      setOrder(data.order);
      setAd(data.ad);
      setEvents(data.events || []);
      setDispute(data.dispute || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id, fetchWithUser]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetchWithUser(`/api/orders/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  }, [id, fetchWithUser]);

  useEffect(() => {
    fetchOrderData();
    fetchMessages();
    const interval = setInterval(() => {
      fetchOrderData();
      fetchMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchOrderData, fetchMessages]);

  // Countdown effect
  useEffect(() => {
    if (!order || order.state !== "CREATED") {
      setTimeLeft("");
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(order.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("EXPIRED");
        fetchOrderData();
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [order, fetchOrderData]);

  // Actions
  const handleMarkPaid = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await fetchWithUser(`/api/orders/${id}/paid`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark paid");
      await fetchOrderData();
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await fetchWithUser(`/api/orders/${id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to release");
      await fetchOrderData();
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order? The seller's USDT will be unlocked.")) return;
    try {
      setActionLoading(true);
      setError(null);
      const res = await fetchWithUser(`/api/orders/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      await fetchOrderData();
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await fetchWithUser(`/api/orders/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open dispute");
      setDisputeModalOpen(false);
      await fetchOrderData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetchWithUser(`/api/orders/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newMessage }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch (err) {
      console.error("Message send failed", err);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading order #{id}...</div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <p className="text-red-400">{error || "Order not found or permission denied."}</p>
        <Link href="/orders" className="text-xs text-emerald-400 hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const isBuyer = currentUser?.id === order.buyerId;
  const isSeller = currentUser?.id === order.sellerId;
  const isAdmin = currentUser?.role === "admin";

  const getStatusColor = (state: string) => {
    switch (state) {
      case "CREATED":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "PAID":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "RELEASED":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "DISPUTED":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "RESOLVED_RELEASED":
      case "RESOLVED_REFUNDED":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      default:
        return "bg-slate-700/30 text-slate-400 border-slate-700/50";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Trade #{order.id}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                order.state
              )}`}
            >
              {order.state}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Buyer: <span className="text-white font-medium">{order.buyerName}</span> {isBuyer && "(You)"} • Seller:{" "}
            <span className="text-white font-medium">{order.sellerName}</span> {isSeller && "(You)"}
          </p>
        </div>

        {timeLeft && order.state === "CREATED" && (
          <div className="bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Payment Window:
            </span>
            <span className="font-mono text-base font-black text-amber-300">{timeLeft}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Main Order Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Status & Payment Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs uppercase font-semibold text-slate-400">Total USDT</span>
                <p className="text-2xl font-mono font-black text-white mt-1">
                  {order.usdtAmountFormatted} <span className="text-xs font-bold text-slate-400">USDT</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">@ ₹{order.priceInrFormatted} / USDT</p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-semibold text-slate-400">Total INR to Transfer</span>
                <p className="text-2xl font-mono font-black text-emerald-400 mt-1">
                  ₹{order.totalInrFormatted}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">INR (Paise rounded down)</p>
              </div>
            </div>

            {/* Seller Payment Details */}
            {ad && (
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-400">
                  Seller&apos;s Payment Details (Pay to this account)
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2">
                  <span className="text-slate-300">Method: <strong className="text-white">{ad.paymentMethod}</strong></span>
                  <span className="font-mono bg-slate-900 px-3 py-1 rounded border border-slate-700 text-emerald-300 text-xs">
                    {ad.paymentDetails}
                  </span>
                </div>
              </div>
            )}

            {/* Escrow status explanation */}
            <div className="text-xs text-slate-400 bg-slate-800/20 p-3 rounded-lg border border-slate-800">
              {order.state === "CREATED" && (
                <p>
                  🔒 <strong>{order.usdtAmountFormatted} USDT</strong> has been deducted from {order.sellerName}&apos;s available balance and safely locked in platform escrow.
                </p>
              )}
              {order.state === "PAID" && (
                <p>
                  💳 Buyer marked the trade as paid. The seller should confirm payment receipt in their bank/UPI account and click <strong>Release USDT</strong>.
                </p>
              )}
              {order.state === "RELEASED" && (
                <p className="text-emerald-400 font-semibold">
                  ✓ USDT released directly to buyer&apos;s in-app wallet. Trade completed safely!
                </p>
              )}
              {order.state === "CANCELLED" && (
                <p className="text-slate-400">
                  ✗ Order cancelled by buyer. Locked USDT returned to seller.
                </p>
              )}
              {order.state === "EXPIRED" && (
                <p className="text-slate-400">
                  ⏱️ Payment window expired. Locked USDT unlocked back to seller.
                </p>
              )}
              {order.state === "DISPUTED" && (
                <p className="text-rose-400 font-semibold">
                  ⚠️ Dispute opened. Reason: &quot;{dispute?.reason}&quot;. Funds remain safely locked in escrow until Admin resolution.
                </p>
              )}
              {order.state === "RESOLVED_RELEASED" && (
                <p className="text-purple-400 font-semibold">
                  🛡️ Admin resolved dispute in favour of buyer. USDT released to buyer.
                </p>
              )}
              {order.state === "RESOLVED_REFUNDED" && (
                <p className="text-orange-400 font-semibold">
                  🛡️ Admin resolved dispute in favour of seller. USDT refunded to seller.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              {/* Buyer buttons */}
              {isBuyer && order.state === "CREATED" && (
                <>
                  <button
                    onClick={handleMarkPaid}
                    disabled={actionLoading}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "✓ I've Paid (INR Transferred)"}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition disabled:opacity-50"
                  >
                    Cancel Trade
                  </button>
                </>
              )}

              {/* Seller buttons */}
              {isSeller && order.state === "PAID" && (
                <button
                  onClick={handleRelease}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg disabled:opacity-50"
                >
                  {actionLoading ? "Releasing..." : "Release USDT to Buyer"}
                </button>
              )}

              {/* Dispute button for either party when PAID */}
              {(isBuyer || isSeller) && order.state === "PAID" && (
                <button
                  onClick={() => setDisputeModalOpen(true)}
                  disabled={actionLoading}
                  className="py-3 px-4 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-sm transition disabled:opacity-50"
                >
                  Open Dispute
                </button>
              )}

              {/* Admin quick link if admin */}
              {isAdmin && order.state === "DISPUTED" && (
                <Link
                  href="/admin"
                  className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm text-center transition"
                >
                  Resolve Dispute in Admin Panel →
                </Link>
              )}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">
              Order Audit Timeline
            </h3>
            <div className="space-y-4 relative pl-4 border-l border-slate-800">
              {events.map((ev) => (
                <div key={ev.id} className="relative group">
                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
                  <div className="text-xs">
                    <span className="font-bold text-white uppercase tracking-wide">
                      {ev.toState}
                    </span>
                    {ev.fromState && (
                      <span className="text-slate-500 ml-1">from {ev.fromState}</span>
                    )}
                    <span className="text-slate-500 text-[11px] ml-2">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </span>
                    {ev.note && (
                      <p className="text-slate-400 mt-0.5 text-xs bg-slate-800/40 p-1.5 rounded">
                        {ev.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Trade Chat */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[520px]">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider pb-3 border-b border-slate-800">
            P2P Trade Chat
          </h3>

          <div className="flex-1 overflow-y-auto py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-xs text-slate-500">
                No messages yet. Send a message to coordinate payment.
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === currentUser?.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-slate-500 mb-0.5">{m.sender_name}</span>
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                        isMe
                          ? "bg-emerald-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 rounded-bl-none"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Open Trade Dispute</h3>
              <button
                onClick={() => setDisputeModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Explain why this trade cannot be completed. The locked USDT will remain safe in escrow while an Admin reviews evidence.
            </p>
            <form onSubmit={handleOpenDispute} className="space-y-4">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                placeholder="e.g. Seller has not released funds despite receiving INR in bank account"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-rose-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="flex-1 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
