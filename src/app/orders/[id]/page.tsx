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

  // Modals & Panels
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseConfirmedCheck, setReleaseConfirmedCheck] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [mobileTab, setMobileTab] = useState<"trade" | "chat">("trade");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

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
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchOrderData, fetchMessages]);

  // Countdown timer logic
  useEffect(() => {
    if (!order || order.state !== "CREATED") {
      setTimeLeft("");
      setIsUrgent(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(order.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setIsUrgent(true);
        fetchOrderData();
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
        setIsUrgent(diff < 2 * 60 * 1000); // Amber in last 2 minutes
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [order, fetchOrderData]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

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

  const handleConfirmRelease = async () => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await fetchWithUser(`/api/orders/${id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to release");
      setShowReleaseModal(false);
      setReleaseConfirmedCheck(false);
      await fetchOrderData();
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this trade? The seller's locked USDT will be returned to their available balance.")) {
      return;
    }
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
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open dispute");
      setShowDisputeModal(false);
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
        body: JSON.stringify({ body: newMessage.trim() }),
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
    return (
      <div className="py-24 text-center">
        <p className="text-sm text-muted font-mono">Loading trade details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-[560px] mx-auto py-16 text-center space-y-4">
        <div className="p-6 bg-surface border border-line rounded-card space-y-3">
          <h2 className="text-base font-semibold text-ink">Trade not found</h2>
          <p className="text-sm text-muted">{error || "You do not have permission to view this trade."}</p>
          <Link
            href="/orders"
            className="inline-block text-xs font-semibold px-4 py-2 bg-paper border border-line rounded-input text-ink hover:border-moss"
          >
            Return to trades
          </Link>
        </div>
      </div>
    );
  }

  const isBuyer = currentUser?.id === order.buyerId;
  const isSeller = currentUser?.id === order.sellerId;
  const isAdmin = currentUser?.role === "admin";

  // Step Tracker indices:
  // Step 1: Order placed (CREATED)
  // Step 2: Pay seller (PAID)
  // Step 3: Seller confirms (RELEASED or terminal)
  // Step 4: Complete
  const getStepIndex = (state: string) => {
    switch (state) {
      case "CREATED":
        return 1;
      case "PAID":
        return 2;
      case "RELEASED":
      case "RESOLVED_RELEASED":
      case "RESOLVED_REFUNDED":
        return 4;
      case "DISPUTED":
        return 2;
      default:
        return 0; // Cancelled / Expired
    }
  };

  const currentStep = getStepIndex(order.state);
  const steps = [
    { num: 1, label: "Order placed" },
    { num: 2, label: "Pay seller" },
    { num: 3, label: "Seller confirms" },
    { num: 4, label: "Complete" },
  ];

  return (
    <div className="max-w-[1020px] mx-auto space-y-6">
      {/* ── Top Bar: Trade ID & Step Tracker ── */}
      <div className="bg-surface border border-line rounded-card p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-baseline gap-3">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              Trade #{order.id}
            </span>
            <span className="text-xs text-muted">
              {isBuyer ? (
                <>Buying from <strong className="text-ink font-medium">{order.sellerName}</strong></>
              ) : isSeller ? (
                <>Selling to <strong className="text-ink font-medium">{order.buyerName}</strong></>
              ) : (
                <>Between {order.buyerName} and {order.sellerName}</>
              )}
            </span>
          </div>

          {/* Time Countdown (only appears when time matters) */}
          {timeLeft && order.state === "CREATED" && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-input border text-xs font-mono tabular-nums ${
                isUrgent
                  ? "bg-amber/10 border-amber/30 text-amber"
                  : "bg-paper border-line text-ink"
              }`}
            >
              <span className="text-[11px] font-sans font-medium text-muted">Pay within</span>
              <span className="font-semibold">{timeLeft}</span>
            </div>
          )}
        </div>

        {/* 4-Step Tracker */}
        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((s) => {
            const isCompleted = currentStep > s.num || currentStep === 4;
            const isCurrent = currentStep === s.num && currentStep !== 4;
            return (
              <div key={s.num} className="flex flex-col gap-1.5">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    isCompleted
                      ? "bg-moss"
                      : isCurrent
                      ? "bg-amber"
                      : "bg-line"
                  }`}
                />
                <span
                  className={`text-[11px] sm:text-xs font-medium truncate ${
                    isCurrent
                      ? "text-ink font-semibold"
                      : isCompleted
                      ? "text-moss"
                      : "text-muted"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Tab Toggle */}
      <div className="md:hidden flex border border-line rounded-input bg-surface p-0.5 text-xs">
        <button
          onClick={() => setMobileTab("trade")}
          className={`flex-1 py-1.5 font-medium rounded-input ${
            mobileTab === "trade" ? "bg-paper text-ink font-semibold" : "text-muted"
          }`}
        >
          Trade details
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-1.5 font-medium rounded-input ${
            mobileTab === "chat" ? "bg-paper text-ink font-semibold" : "text-muted"
          }`}
        >
          Chat ({messages.length})
        </button>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-3 bg-paper border border-alert/30 rounded-input text-xs text-alert flex items-start justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-muted hover:text-ink ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ── Core Two-Column Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Trade Summary, Actions, Payment Info, Timeline */}
        <div className={`md:col-span-7 space-y-6 ${mobileTab === "chat" ? "hidden md:block" : ""}`}>
          {/* Plain Summary & Primary Action Card */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted font-semibold">
                Summary
              </p>
              <p className="text-base sm:text-lg text-ink font-medium mt-1">
                {isBuyer ? "You are buying " : "You are selling "}
                <span className="font-mono font-semibold text-ink tabular-nums">
                  {order.usdtAmountFormatted} USDT
                </span>{" "}
                for{" "}
                <span className="font-mono font-semibold text-ink tabular-nums">
                  ₹{order.totalInrFormatted}
                </span>
              </p>
              <p className="text-xs text-muted font-mono mt-0.5 tabular-nums">
                Rate: ₹{order.priceInrFormatted} per USDT
              </p>
            </div>

            {/* Escrow Status Statement */}
            <div className="bg-paper border border-line rounded-input p-3.5 text-xs text-muted leading-relaxed">
              <strong className="text-ink font-semibold">Escrow protected:</strong>{" "}
              {order.state === "CREATED" && (
                <>
                  {order.usdtAmountFormatted} USDT is held safely in platform escrow. The seller cannot withdraw it while this trade is active.
                </>
              )}
              {order.state === "PAID" && (
                <>
                  Payment reported. The seller has been instructed to check their account and release your {order.usdtAmountFormatted} USDT.
                </>
              )}
              {order.state === "RELEASED" && (
                <span className="text-buy font-medium">
                  Trade completed. {order.usdtAmountFormatted} USDT was deposited directly into the buyer&apos;s available wallet.
                </span>
              )}
              {order.state === "CANCELLED" && (
                <span>Trade cancelled. The seller&apos;s USDT has been returned to their balance.</span>
              )}
              {order.state === "EXPIRED" && (
                <span>Trade expired. Payment deadline passed; USDT unlocked back to seller.</span>
              )}
              {order.state === "DISPUTED" && (
                <span className="text-alert font-medium">
                  Disputed: &quot;{dispute?.reason}&quot;. Funds remain locked until Admin investigation concludes.
                </span>
              )}
              {order.state === "RESOLVED_RELEASED" && (
                <span className="text-buy font-medium">
                  Dispute resolved by Admin. Funds released to buyer.
                </span>
              )}
              {order.state === "RESOLVED_REFUNDED" && (
                <span className="text-sell font-medium">
                  Dispute resolved by Admin. Funds refunded back to seller.
                </span>
              )}
            </div>

            {/* ── Seller's Payment Details (Copyable) ── */}
            {ad && (
              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted font-semibold">
                    Seller payment details
                  </span>
                  <span className="text-xs text-muted font-medium">
                    Method: <strong className="text-ink">{ad.paymentMethod}</strong>
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-paper border border-line rounded-input text-xs">
                    <div>
                      <span className="text-[10px] text-muted uppercase block">Account / UPI ID</span>
                      <span className="font-mono text-ink font-medium select-all">
                        {ad.paymentDetails}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(ad.paymentDetails, "upi")}
                      className="px-2 py-1 rounded-input text-xs border border-line bg-surface text-muted hover:text-ink"
                    >
                      {copiedField === "upi" ? "Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-paper border border-line rounded-input text-xs">
                    <div>
                      <span className="text-[10px] text-muted uppercase block">Exact Amount to Transfer</span>
                      <span className="font-mono text-ink font-semibold tabular-nums">
                        ₹{order.totalInrFormatted}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.totalInrFormatted.replace(/,/g, ""), "amount")}
                      className="px-2 py-1 rounded-input text-xs border border-line bg-surface text-muted hover:text-ink"
                    >
                      {copiedField === "amount" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── One Primary Action + Safety Copy Beside It ── */}
            <div className="pt-2 border-t border-line space-y-4">
              {/* Buyer CREATED State */}
              {isBuyer && order.state === "CREATED" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-muted sm:max-w-[280px]">
                    Pay the seller through your banking app, then press confirm.
                  </p>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="px-3 py-2 text-xs text-muted hover:text-ink rounded-input border border-line"
                    >
                      Cancel trade
                    </button>
                    <button
                      onClick={handleMarkPaid}
                      disabled={actionLoading}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-input bg-moss text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-50"
                    >
                      {actionLoading ? "Updating..." : "I have paid"}
                    </button>
                  </div>
                </div>
              )}

              {/* Seller PAID State */}
              {isSeller && order.state === "PAID" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <p className="text-xs text-muted sm:max-w-[280px] leading-relaxed">
                    Only release after the money is in your bank account. Check the sender&apos;s name matches {order.buyerName}.
                  </p>
                  <button
                    onClick={() => {
                      setReleaseConfirmedCheck(false);
                      setShowReleaseModal(true);
                    }}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-input bg-moss text-xs font-semibold shadow-sm hover:opacity-95"
                  >
                    Release USDT
                  </button>
                </div>
              )}

              {/* Buyer PAID Waiting State */}
              {isBuyer && order.state === "PAID" && (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-muted leading-relaxed">
                    Payment reported. Waiting for {order.sellerName} to confirm receipt and release funds.
                  </p>
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="text-xs text-muted hover:text-alert underline whitespace-nowrap"
                  >
                    Report problem
                  </button>
                </div>
              )}

              {/* Seller CREATED Waiting State */}
              {isSeller && order.state === "CREATED" && (
                <div className="text-xs text-muted leading-relaxed">
                  Waiting for buyer to transfer ₹{order.totalInrFormatted}. Your USDT is safely locked in escrow until you release it.
                </div>
              )}

              {/* Dispute Button when in PAID state */}
              {isSeller && order.state === "PAID" && (
                <div className="pt-2 text-right">
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="text-xs text-muted hover:text-alert underline"
                  >
                    Payment not received? Open dispute
                  </button>
                </div>
              )}

              {/* Admin Resolve Link if viewed by Admin */}
              {isAdmin && order.state === "DISPUTED" && (
                <Link
                  href="/admin"
                  className="block text-center py-2 px-4 rounded-input bg-surface border border-line text-xs font-semibold text-ink hover:border-moss"
                >
                  Manage and resolve dispute in Admin Panel →
                </Link>
              )}
            </div>
          </div>

          {/* ── Order Event Timeline ── */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-muted font-semibold">
              Event timeline
            </h3>

            <div className="space-y-3 relative pl-4 border-l border-line text-xs">
              {events.map((ev) => (
                <div key={ev.id} className="relative group">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-muted group-hover:bg-moss" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-ink">
                      {ev.toState === "CREATED"
                        ? "Order opened"
                        : ev.toState === "PAID"
                        ? "Buyer marked paid"
                        : ev.toState === "RELEASED"
                        ? "Seller released USDT"
                        : ev.toState === "CANCELLED"
                        ? "Order cancelled"
                        : ev.toState === "EXPIRED"
                        ? "Order expired"
                        : ev.toState}
                    </span>
                    <span className="text-[11px] text-muted font-mono tabular-nums">
                      {new Date(ev.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  {ev.note && <p className="text-muted mt-0.5 text-[11px]">{ev.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Chat & Coordination Panel */}
        <div className={`md:col-span-5 ${mobileTab === "trade" ? "hidden md:block" : ""}`}>
          <div className="bg-surface border border-line rounded-card p-4 sm:p-5 flex flex-col h-[520px] shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-muted font-semibold">
                  Trade chat
                </h3>
                <p className="text-[11px] text-muted mt-0.5">
                  Keep payment coordination inside Nevora for dispute evidence.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-muted text-xs p-4">
                  No messages yet. Send a message to confirm bank transfer details.
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === currentUser?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <span className="text-[10px] text-muted mb-0.5">
                        {m.sender_name} {isMe && "(You)"}
                      </span>
                      <div
                        className={`max-w-[85%] rounded-input px-3 py-2 text-xs leading-relaxed ${
                          isMe
                            ? "bg-paper border border-line text-ink"
                            : "bg-surface border border-line text-ink"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="pt-2 border-t border-line flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-paper border border-line rounded-input py-2 px-3 text-xs text-ink focus:outline-none focus:border-moss"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-moss text-xs font-semibold rounded-input"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Release Confirmation Dialog (Deliberate 2-step verification) ── */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line rounded-card max-w-[420px] w-full p-6 space-y-5 shadow-lg">
            <h3 className="text-base font-semibold text-ink">
              Release {order.usdtAmountFormatted} USDT to {order.buyerName}?
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              This action is irreversible. Once confirmed, {order.usdtAmountFormatted} USDT will immediately transfer to {order.buyerName}&apos;s wallet.
            </p>

            <div className="bg-paper border border-line rounded-input p-3 space-y-2 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={releaseConfirmedCheck}
                  onChange={(e) => setReleaseConfirmedCheck(e.target.checked)}
                  className="mt-0.5 rounded border-line text-moss focus:ring-moss"
                />
                <span className="text-ink text-xs leading-snug">
                  I have logged into my bank or UPI app and verified that ₹{order.totalInrFormatted} has arrived from {order.buyerName}.
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReleaseModal(false)}
                className="flex-1 py-2 px-3 rounded-input border border-line text-xs font-medium text-muted hover:text-ink"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmRelease}
                disabled={!releaseConfirmedCheck || actionLoading}
                className="flex-1 py-2 px-3 rounded-input bg-moss text-xs font-semibold disabled:opacity-40"
              >
                {actionLoading ? "Releasing..." : "Confirm release"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dispute Modal ── */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line rounded-card max-w-[440px] w-full p-6 space-y-4 shadow-lg">
            <h3 className="text-base font-semibold text-ink">Open dispute for Trade #{order.id}</h3>
            <p className="text-xs text-muted leading-relaxed">
              A platform administrator will review the payment details, trade chat, and bank records. Funds remain safely in escrow during dispute review.
            </p>

            <form onSubmit={handleOpenDispute} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">
                  Reason for dispute
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="Explain clearly what happened (e.g., payment was sent but seller hasn't released, or payment was not received)"
                  className="w-full bg-paper border border-line rounded-input p-2.5 text-xs text-ink focus:outline-none focus:border-alert"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 py-2 px-3 rounded-input border border-line text-xs font-medium text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !disputeReason.trim()}
                  className="flex-1 py-2 px-3 rounded-input bg-alert text-white text-xs font-semibold disabled:opacity-40"
                >
                  {actionLoading ? "Submitting..." : "Submit dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
