"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function CreateAdPage() {
  const router = useRouter();
  const { currentUser, balances, fetchWithUser, refreshUser } = useUser();

  const [priceInr, setPriceInr] = useState("88.00");
  const [totalUsdt, setTotalUsdt] = useState("100");
  const [minUsdt, setMinUsdt] = useState("10");
  const [maxUsdt, setMaxUsdt] = useState("100");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentDetails, setPaymentDetails] = useState("alice@okaxis");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentUser?.role !== "seller" && currentUser?.role !== "admin") {
      setError("Only sellers can post sell advertisements. Switch to Alice or Admin.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetchWithUser("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceInr,
          totalUsdt,
          minUsdt,
          maxUsdt,
          paymentMethod,
          paymentDetails,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish ad");

      await refreshUser();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Post Sell Advertisement</h1>
        <p className="text-sm text-muted">
          Offer your USDT for INR. Funds are locked into escrow when a buyer initiates an order.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-card p-6 space-y-5">
        <div className="bg-paper border border-line rounded-input p-3 flex items-center justify-between text-xs">
          <span className="text-muted">Your available balance:</span>
          <span className="font-mono font-semibold text-ink tabular-nums">
            {balances?.availableFormatted ?? "0.00"} USDT
          </span>
        </div>

        {error && (
          <div className="p-3 bg-paper border border-alert/30 rounded-input text-xs text-alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
              Unit price (INR per USDT)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-muted font-mono font-medium">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={priceInr}
                onChange={(e) => setPriceInr(e.target.value)}
                required
                className="w-full bg-paper border border-line rounded-input py-2 pl-7 pr-3 text-ink font-mono focus:outline-none focus:border-moss"
              />
            </div>
          </div>

          <div>
            <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
              Total USDT to sell
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                value={totalUsdt}
                onChange={(e) => {
                  setTotalUsdt(e.target.value);
                  if (parseFloat(maxUsdt) > parseFloat(e.target.value)) {
                    setMaxUsdt(e.target.value);
                  }
                }}
                required
                className="w-full bg-paper border border-line rounded-input py-2 px-3 text-ink font-mono focus:outline-none focus:border-moss"
              />
              <span className="absolute right-3 top-2 text-muted font-mono font-medium">USDT</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
                Min order limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={minUsdt}
                  onChange={(e) => setMinUsdt(e.target.value)}
                  required
                  className="w-full bg-paper border border-line rounded-input py-2 px-3 text-ink font-mono focus:outline-none focus:border-moss"
                />
                <span className="absolute right-3 top-2 text-muted font-mono text-[10px]">USDT</span>
              </div>
            </div>
            <div>
              <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
                Max order limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={maxUsdt}
                  onChange={(e) => setMaxUsdt(e.target.value)}
                  required
                  className="w-full bg-paper border border-line rounded-input py-2 px-3 text-ink font-mono focus:outline-none focus:border-moss"
                />
                <span className="absolute right-3 top-2 text-muted font-mono text-[10px]">USDT</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
              Payment method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-paper border border-line rounded-input py-2 px-3 text-ink focus:outline-none focus:border-moss cursor-pointer"
            >
              <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
              <option value="IMPS">IMPS Bank Transfer</option>
              <option value="PayTM">Paytm Wallet / Bank</option>
            </select>
          </div>

          <div>
            <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
              Payment details (Account number / UPI ID)
            </label>
            <input
              type="text"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder="e.g. alice@upi"
              required
              className="w-full bg-paper border border-line rounded-input py-2 px-3 text-ink focus:outline-none focus:border-moss"
            />
          </div>

          <p className="text-[11px] text-muted leading-relaxed pt-1">
            Publishing this ad makes it visible in the marketplace. Your USDT remains in your balance until a buyer creates a trade, at which point the required amount is safely locked.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-input bg-moss text-xs font-semibold disabled:opacity-40"
          >
            {loading ? "Publishing..." : "Publish advertisement"}
          </button>
        </form>
      </div>
    </div>
  );
}
