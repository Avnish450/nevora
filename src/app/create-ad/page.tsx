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
      setError("Only sellers can create sell ads. Switch user to Alice or Admin.");
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to create ad");
      }

      await refreshUser();
      router.push("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Create USDT Sell Ad</h1>
        <p className="text-sm text-slate-400 mt-1">
          Post an ad to sell your USDT for INR. Funds are locked into escrow when a buyer opens an order.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">Your Available Balance:</span>
          <span className="font-mono font-bold text-emerald-400">
            {balances?.availableFormatted ?? "0.000000"} USDT
          </span>
        </div>

        {error && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Unit Price (INR per USDT)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={priceInr}
                onChange={(e) => setPriceInr(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-8 pr-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Total USDT to Sell
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
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">USDT</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Min Order Limit (USDT)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={minUsdt}
                onChange={(e) => setMinUsdt(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Max Order Limit (USDT)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={maxUsdt}
                onChange={(e) => setMaxUsdt(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="UPI">UPI</option>
              <option value="IMPS">IMPS Bank Transfer</option>
              <option value="PayTM">PayTM</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Payment Details (e.g. UPI ID or Account Info)
            </label>
            <input
              type="text"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              placeholder="e.g. alice@upi"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg disabled:opacity-50 mt-2"
          >
            {loading ? "Publishing Ad..." : "Publish Sell Ad"}
          </button>
        </form>
      </div>
    </div>
  );
}
