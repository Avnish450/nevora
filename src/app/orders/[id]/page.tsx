"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import StepTracker from "@/components/StepTracker";
import AnimatedPadlock from "@/components/AnimatedPadlock";
import AnimatedCheckmark from "@/components/AnimatedCheckmark";
import CopyField from "@/components/CopyField";

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

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [underFiveMin, setUnderFiveMin] = useState<boolean>(false);

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

  // Countdown timer logic with amber and gentle pulse
  useEffect(() => {
    if (!order || order.state !== "CREATED") {
      setTimeLeft("");
      setIsUrgent(false);
      setUnderFiveMin(false);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(order.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setIsUrgent(true);
        setUnderFiveMin(true);
        fetchOrderData();
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
        setUnderFiveMin(diff < 5 * 60 * 1000);
        setIsUrgent(diff < 2 * 60 * 1000); // Gentle pulse in last 2 minutes
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [order, fetchOrderData]);

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
    if (!confirm("Cancel this trade? The seller's locked USDT will immediately return to their available balance.")) {
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

  const isLocked = order.state === "CREATED" || order.state === "PAID" || order.state === "DISPUTED";
  const isCompleted = order.state === "RELEASED" || order.state === "RESOLVED_RELEASED" || order.state === "RESOLVED_REFUNDED";
  const isTerminalCancelled = order.state === "CANCELLED" || order.state === "EXPIRED";

  // Step tracker state
  let currentStepIndex = 0;
  if (order.state === "CREATED") currentStepIndex = 0;
  else if (order.state === "PAID" || order.state === "DISPUTED") currentStepIndex = 1;
  else if (isCompleted) currentStepIndex = 2;

  const STEPS = [
    { id: "lock", label: "USDT Locked", description: "In platform escrow" },
    { id: "pay", label: "INR Transferred", description: "Direct UPI/Bank" },
    { id: "release", label: "USDT Released", description: "To buyer wallet" },
  ];

  return (
    <div className="max-w-[1040px] mx-auto space-y-7">
      {/* ── Top Bar: Trade ID & Step Tracker ── */}
      <div className="bg-surface border border-line rounded-[28px] p-5 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-[#7D00FF] font-mono font-bold bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-200/50">
              Trade #{order.id}
            </span>
            <span className="text-xs text-muted font-medium">
              {isBuyer ? (
                <>Buying from <strong className="text-ink font-bold">{order.sellerName}</strong></>
              ) : isSeller ? (
                <>Selling to <strong className="text-ink font-bold">{order.buyerName}</strong></>
              ) : (
                <>{order.buyerName} &harr; {order.sellerName}</>
              )}
            </span>
          </div>

          {/* Time Countdown */}
          {timeLeft && order.state === "CREATED" && (
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono tabular-nums ${
                isUrgent
                  ? "bg-amber/15 border-amber/40 text-amber animate-gentle-pulse font-bold"
                  : underFiveMin
                  ? "bg-amber/10 border-amber/30 text-amber font-semibold"
                  : "bg-surface-subtle border-line text-ink font-medium"
              }`}
            >
              <span className="text-[11px] font-sans font-medium text-muted">Pay within</span>
              <span>{timeLeft}</span>
            </div>
          )}
        </div>

        {/* 3-Step Animated Tracker */}
        <StepTracker
          steps={STEPS}
          currentStepIndex={currentStepIndex}
          isDisputed={order.state === "DISPUTED"}
          isCancelled={order.state === "CANCELLED"}
          isExpired={order.state === "EXPIRED"}
        />
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

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Trade Details & Actions */}
        <div className={`md:col-span-7 space-y-6 ${mobileTab === "chat" ? "hidden md:block" : "block"}`}>
          {/* Summary Card with Signature Padlock */}
          <div className="bg-surface border border-line rounded-[28px] p-6 sm:p-7 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider text-muted font-bold">
                  Escrow Settlement Status
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink font-['Plus_Jakarta_Sans']">
                    {order.state === "CREATED" && "Awaiting INR payment"}
                    {order.state === "PAID" && "Payment marked — awaiting seller release"}
                    {order.state === "RELEASED" && "Trade completed successfully"}
                    {order.state === "DISPUTED" && "Trade in arbitration dispute"}
                    {order.state === "CANCELLED" && "Trade cancelled"}
                    {order.state === "EXPIRED" && "Trade expired"}
                  </h2>
                </div>
              </div>

              {/* Signature Escrow Padlock or Success Checkmark */}
              {isCompleted ? (
                <AnimatedCheckmark size={36} />
              ) : (
                <AnimatedPadlock isLocked={isLocked} size={32} />
              )}
            </div>

            {/* Financial Numbers with Tabular Alignment */}
            <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-surface-subtle border border-line">
              <div className="space-y-1">
                <span className="text-[11px] text-muted font-semibold block">You Receive / Transfer</span>
                <div className="font-mono text-2xl sm:text-3xl font-extrabold text-[#7D00FF] tabular-nums">
                  {order.usdtAmountFormatted}{" "}
                  <span className="text-xs text-muted font-sans font-bold">USDT</span>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[11px] text-muted font-semibold block">Total INR Amount</span>
                <div className="font-mono text-2xl sm:text-3xl font-extrabold text-ink tabular-nums">
                  ₹{order.totalInrFormatted}
                </div>
                <span className="text-[10px] text-muted font-mono font-medium block">
                  @ ₹{order.priceInrFormatted} / USDT
                </span>
              </div>
            </div>

            {/* Escrow Guarantee Status Bar */}
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-surface-subtle border border-line text-xs text-muted font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C278] shadow-xs" />
              <span>
                {isLocked
                  ? "100% of USDT is currently locked in platform escrow."
                  : isCompleted
                  ? "USDT has been credited to the buyer's wallet balance."
                  : "USDT has been unlocked and returned to the seller."}
              </span>
            </div>

            {/* Payment Details with Copy Fields */}
            {ad && (
              <div className="space-y-3 pt-2 border-t border-line">
                <h3 className="text-xs uppercase tracking-wider text-muted font-bold">
                  Seller Payment Details ({ad.paymentMethod})
                </h3>
                <CopyField
                  label="Payment Account / UPI VPA"
                  value={ad.paymentDetails}
                />
                <CopyField
                  label="Exact INR Amount"
                  value={order.totalInrFormatted.replace(/,/g, "")}
                  displayValue={`₹${order.totalInrFormatted}`}
                />
              </div>
            )}

            {/* Irreversible Action Area */}
            <div className="pt-4 border-t border-line space-y-3">
              {error && (
                <div className="p-3 bg-red-500/10 border border-alert/30 rounded-2xl text-xs text-alert font-medium animate-shake">
                  {error}
                </div>
              )}

              {/* BUYER ACTIONS */}
              {isBuyer && order.state === "CREATED" && (
                <div className="space-y-2">
                  <button
                    onClick={handleMarkPaid}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 rounded-full btn-moonpay text-sm font-bold shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all"
                  >
                    {actionLoading ? "Confirming..." : `I Have Paid ₹${order.totalInrFormatted}`}
                  </button>
                  <p className="text-[11px] text-center text-muted">
                    Only click after transferring the exact amount from your own bank account.
                  </p>
                  <div className="text-center pt-2">
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading}
                      className="text-xs text-muted hover:text-alert underline font-medium"
                    >
                      Cancel this trade
                    </button>
                  </div>
                </div>
              )}

              {/* SELLER ACTIONS */}
              {isSeller && order.state === "PAID" && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowReleaseModal(true)}
                    disabled={actionLoading}
                    className="w-full py-3.5 px-4 rounded-full btn-moonpay text-sm font-bold shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all"
                  >
                    Release {order.usdtAmountFormatted} USDT to Buyer
                  </button>
                  <p className="text-[11px] text-center text-muted">
                    Check your bank app first. This transfer is immediate and irreversible.
                  </p>
                </div>
              )}

              {/* DISPUTE ACTION */}
              {(isBuyer || isSeller) && order.state === "PAID" && !dispute && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="text-xs text-muted hover:text-amber underline"
                  >
                    Having trouble? Open a trade dispute
                  </button>
                </div>
              )}

              {/* DISPUTE NOTICE */}
              {order.state === "DISPUTED" && (
                <div className="p-4 rounded-input bg-amber/10 border border-amber/30 text-xs space-y-2">
                  <p className="font-semibold text-ink">
                    This trade is under administrative arbitration.
                  </p>
                  <p className="text-muted leading-relaxed">
                    The escrowed USDT is frozen. A Nevora administrator is reviewing bank transaction proofs.
                  </p>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="inline-block mt-1 px-3 py-1.5 rounded-input bg-moss text-white font-semibold text-xs btn-press"
                    >
                      Arbitrate in Admin Panel &rarr;
                    </Link>
                  )}
                </div>
              )}

              {/* COMPLETED SUCCESS BANNER */}
              {isCompleted && (
                <div className="p-4 rounded-input bg-paper border border-line text-xs space-y-1">
                  <p className="font-semibold text-buy flex items-center gap-1.5">
                    <span>✓</span> Trade completed and settled
                  </p>
                  <p className="text-muted">
                    Check your{" "}
                    <Link href="/wallet" className="text-moss underline">
                      Wallet
                    </Link>{" "}
                    or inspect the immutable journal entries on the{" "}
                    <Link href="/ledger" className="text-moss underline">
                      Ledger
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Chat & Trade Timeline */}
        <div className={`md:col-span-5 space-y-6 ${mobileTab === "trade" ? "hidden md:block" : "block"}`}>
          {/* Chat Window */}
          <div className="bg-surface border border-line rounded-card overflow-hidden flex flex-col h-[480px] shadow-xs">
            <div className="p-3 bg-paper border-b border-line flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted font-semibold">
                Trade Chat
              </span>
              <span className="text-[11px] text-muted">
                {isBuyer ? order.sellerName : order.buyerName}
              </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.length === 0 ? (
                <div className="py-16 text-center text-muted space-y-1">
                  <p>No messages yet.</p>
                  <p className="text-[11px]">Coordinate payment details directly with your trading partner.</p>
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
                        {m.sender_name}
                      </span>
                      <div
                        className={`p-2.5 rounded-input max-w-[85%] text-xs ${
                          isMe
                            ? "bg-moss text-white rounded-br-xs"
                            : "bg-paper text-ink border border-line rounded-bl-xs"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-line flex gap-2">
              <input
                type="text"
                placeholder="Type message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-paper border border-line rounded-input px-3 py-2 text-xs text-ink focus:outline-none focus:border-moss"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-3.5 py-2 rounded-input bg-moss text-white text-xs font-semibold disabled:opacity-40 btn-press"
              >
                Send
              </button>
            </form>
          </div>

          {/* Trade Timeline Audit Log */}
          <div className="bg-surface border border-line rounded-card p-4 space-y-3 shadow-xs">
            <h3 className="text-xs uppercase tracking-wider text-muted font-semibold">
              Event Timeline
            </h3>
            <div className="space-y-2 text-xs">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-moss mt-1.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-ink font-medium">
                      {ev.fromState ? `${ev.fromState} &rarr; ` : ""}{ev.toState}
                    </span>
                    {ev.note && <p className="text-[11px] text-muted">{ev.note}</p>}
                    <span className="text-[10px] text-muted font-mono block tabular-nums">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Step Release Confirmation Modal ── */}
      {showReleaseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className="bg-surface border border-line rounded-card max-w-[420px] w-full p-6 space-y-5 shadow-lg animate-fade-up"
            style={{
              animation: "fadeUp 200ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-semibold text-ink">
                Confirm USDT Release
              </h3>
              <button
                onClick={() => setShowReleaseModal(false)}
                className="text-muted hover:text-ink text-sm p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-paper border border-line rounded-input space-y-2 text-xs">
              <p className="text-ink font-medium">
                You are about to release {order.usdtAmountFormatted} USDT to {order.buyerName}.
              </p>
              <p className="text-muted leading-relaxed">
                This action is final and cannot be reversed by anyone, including administrators.
              </p>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-ink cursor-pointer select-none">
              <input
                type="checkbox"
                checked={releaseConfirmedCheck}
                onChange={(e) => setReleaseConfirmedCheck(e.target.checked)}
                className="mt-0.5 accent-moss w-4 h-4 rounded"
              />
              <span>
                I have logged into my bank/UPI app and verified that I received exactly ₹{order.totalInrFormatted}.
              </span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReleaseModal(false)}
                className="flex-1 py-2.5 px-3 rounded-input border border-line text-xs font-medium text-muted hover:text-ink btn-press"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!releaseConfirmedCheck || actionLoading}
                onClick={handleConfirmRelease}
                className="flex-1 py-2.5 px-3 rounded-input bg-moss text-white text-xs font-semibold disabled:opacity-40 btn-press"
              >
                {actionLoading ? "Releasing..." : "Yes, Release USDT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dispute Modal ── */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className="bg-surface border border-line rounded-card max-w-[420px] w-full p-6 space-y-5 shadow-lg animate-fade-up"
            style={{
              animation: "fadeUp 200ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-semibold text-ink">
                Open Trade Dispute
              </h3>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="text-muted hover:text-ink text-sm p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOpenDispute} className="space-y-4 text-xs">
              <p className="text-muted leading-relaxed">
                Opening a dispute will freeze the escrowed USDT. An administrator will arbitrate based on bank statements and UPI reference IDs.
              </p>
              <div>
                <label className="block text-ink font-medium mb-1">
                  Reason for dispute
                </label>
                <textarea
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain what happened (e.g. money not received, wrong amount)..."
                  required
                  className="w-full bg-paper border border-line rounded-input p-3 text-ink text-xs focus:outline-none focus:border-moss"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="flex-1 py-2.5 px-3 rounded-input border border-line text-xs font-medium text-muted hover:text-ink btn-press"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!disputeReason.trim() || actionLoading}
                  className="flex-1 py-2.5 px-3 rounded-input bg-alert text-white text-xs font-semibold disabled:opacity-40 btn-press"
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
