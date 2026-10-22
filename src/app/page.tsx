"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

interface Ad {
  id: number;
  sellerId: number;
  sellerName: string;
  priceInr: string;
  totalUsdtFormatted: string;
  remainingUsdtFormatted: string;
  minUsdtFormatted: string;
  maxUsdtFormatted: string;
  paymentMethod: string;
  paymentDetails: string;
}

export default function MarketplacePage() {
  const router = useRouter();
  const { currentUser, balances, fetchWithUser, refreshUser } = useUser();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buy modal state
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ads");
      if (!res.ok) throw new Error("Failed to load ads");
      const data = await res.json();
      setAds(data.ads || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleOpenBuy = (ad: Ad) => {
    setSelectedAd(ad);
    setBuyAmount(ad.minUsdtFormatted);
    setBuyError(null);
  };

  const calculateTotalInr = () => {
    if (!selectedAd || !buyAmount) return "0.00";
    const amount = parseFloat(buyAmount);
    const price = parseFloat(selectedAd.priceInr);
    if (isNaN(amount) || isNaN(price) || amount <= 0) return "0.00";
    return (amount * price).toFixed(2);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAd || !buyAmount) return;

    try {
      setSubmitting(true);
      setBuyError(null);

      const res = await fetchWithUser("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adId: selectedAd.id,
          usdtAmount: buyAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      await refreshUser();
      router.push(`/orders/${data.order.id}`);
    } catch (err) {
      setBuyError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Demo helper banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-emerald-400">
            Demo Marketplace (Fake Money Only)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Current actor: <span className="text-white font-bold">{currentUser?.name}</span> ({currentUser?.role}).{" "}
            {currentUser?.name === "Alice"
              ? "You are Alice (Seller). To buy, switch to Bob using the top-right user switcher."
              : currentUser?.name === "Bob"
              ? "You are Bob (Buyer). Pick an ad below and click 'Buy USDT' to lock the seller's funds in escrow."
              : "You are Admin. Switch to Bob to buy, or check the Admin Panel."}
          </p>
        </div>
        <button
          onClick={fetchAds}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
        >
          ↻ Refresh Ads
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">P2P Buy USDT</h1>
          <p className="text-sm text-slate-400">Buy USDT with INR via secure platform escrow</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading active ads...</div>
      ) : ads.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-400">No active ads right now.</p>
          <p className="text-xs text-slate-500 mt-1">
            Switch to Alice and post a sell ad from the &quot;Create Ad&quot; page.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Seller</th>
                  <th className="py-3.5 px-4">Price / USDT</th>
                  <th className="py-3.5 px-4">Available</th>
                  <th className="py-3.5 px-4">Order Limit</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ads.map((ad) => {
                  const isOwner = currentUser?.id === ad.sellerId;
                  return (
                    <tr key={ad.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                            {ad.sellerName[0]}
                          </div>
                          <span>{ad.sellerName}</span>
                          {isOwner && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-emerald-400 text-base">
                        ₹{ad.priceInr}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-300">
                        {ad.remainingUsdtFormatted} USDT
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                        {ad.minUsdtFormatted} - {ad.maxUsdtFormatted} USDT
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {ad.paymentMethod}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOpenBuy(ad)}
                          disabled={isOwner}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold shadow transition ${
                            isOwner
                              ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                          }`}
                        >
                          {isOwner ? "Your Ad" : "Buy USDT"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Buy Order Modal */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                Buy USDT from {selectedAd.sellerName}
              </h3>
              <button
                onClick={() => setSelectedAd(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Price:</span>
                <span className="font-mono font-bold text-emerald-400">₹{selectedAd.priceInr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Available:</span>
                <span className="font-mono text-slate-200">{selectedAd.remainingUsdtFormatted} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Limits:</span>
                <span className="font-mono text-slate-300">
                  {selectedAd.minUsdtFormatted} - {selectedAd.maxUsdtFormatted} USDT
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Details:</span>
                <span className="font-medium text-slate-200">
                  {selectedAd.paymentMethod} ({selectedAd.paymentDetails})
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Amount in USDT to Buy
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="e.g. 50"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                    USDT
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Total to Pay Seller:</span>
                <span className="text-lg font-mono font-bold text-white">
                  ₹{calculateTotalInr()}
                </span>
              </div>

              {buyError && (
                <div className="p-2.5 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
                  {buyError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAd(null)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
                >
                  {submitting ? "Locking Escrow..." : "Confirm & Lock Escrow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
