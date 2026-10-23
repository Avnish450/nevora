"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Link from "next/link";

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
  const { currentUser, fetchWithUser, refreshUser } = useUser();

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [amountFilter, setAmountFilter] = useState<string>("");

  // Buy order modal
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [buyAmount, setBuyAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ads");
      if (!res.ok) throw new Error("Failed to load active marketplace ads");
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
    const amount = parseFloat(buyAmount.replace(/,/g, ""));
    const price = parseFloat(selectedAd.priceInr.replace(/,/g, ""));
    if (isNaN(amount) || isNaN(price) || amount <= 0) return "0.00";
    const total = amount * price;
    return total.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
        throw new Error(data.error || "Failed to create trade");
      }

      await refreshUser();
      router.push(`/orders/${data.order.id}`);
    } catch (err) {
      setBuyError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter ads
  const filteredAds = ads.filter((ad) => {
    if (paymentFilter !== "ALL" && ad.paymentMethod !== paymentFilter) {
      return false;
    }
    if (amountFilter) {
      const needed = parseFloat(amountFilter);
      const min = parseFloat(ad.minUsdtFormatted.replace(/,/g, ""));
      const max = parseFloat(ad.maxUsdtFormatted.replace(/,/g, ""));
      if (!isNaN(needed) && (needed < min || needed > max)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1120px] mx-auto">
      {/* ── Page Header & Clear Value Promise ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          P2P Marketplace
        </h1>
        <p className="text-sm text-muted max-w-[680px]">
          Buy and sell USDT with INR. Your crypto stays locked in platform escrow until the payment is confirmed.
        </p>
      </div>

      {/* ── Controls: Buy / Sell Toggle & Filters Bar ── */}
      <div className="bg-surface border border-line rounded-card p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Buy / Sell Segmented Control */}
        <div className="inline-flex bg-paper border border-line rounded-input p-0.5 self-start">
          <button
            onClick={() => setSide("buy")}
            className={`px-4 py-1.5 font-medium rounded-input transition-colors ${
              side === "buy"
                ? "bg-surface text-buy font-semibold border border-line shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            Buy USDT
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`px-4 py-1.5 font-medium rounded-input transition-colors ${
              side === "sell"
                ? "bg-surface text-sell font-semibold border border-line shadow-xs"
                : "text-muted hover:text-ink"
            }`}
          >
            Sell USDT
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Amount input filter */}
          <div className="flex items-center bg-paper border border-line rounded-input px-2.5 py-1">
            <span className="text-muted mr-1.5">Amount:</span>
            <input
              type="number"
              placeholder="e.g. 50"
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              className="bg-transparent w-20 text-ink font-mono text-xs focus:outline-none"
            />
            <span className="text-muted text-[10px]">USDT</span>
          </div>

          {/* Payment method selector */}
          <div className="flex items-center bg-paper border border-line rounded-input px-2.5 py-1">
            <span className="text-muted mr-1.5">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-ink text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface">All methods</option>
              <option value="UPI" className="bg-surface">UPI</option>
              <option value="IMPS" className="bg-surface">IMPS</option>
              <option value="PayTM" className="bg-surface">PayTM</option>
            </select>
          </div>

          <button
            onClick={fetchAds}
            className="px-2.5 py-1 text-xs text-muted hover:text-ink border border-line rounded-input bg-paper ml-auto sm:ml-0"
            title="Refresh ads"
          >
            Refresh
          </button>
        </div>
      </div>

      {side === "sell" && (
        <div className="p-4 bg-surface border border-line rounded-card text-xs space-y-2">
          <p className="text-ink font-medium">Want to sell your USDT for INR?</p>
          <p className="text-muted">
            Post an advertisement to sell your USDT at your chosen exchange rate. Buyers will see your ad and initiate trades.
          </p>
          <Link
            href="/create-ad"
            className="inline-block mt-1 px-4 py-2 bg-moss text-xs font-semibold rounded-input"
          >
            Post a sell ad
          </Link>
        </div>
      )}

      {error && (
        <div className="p-3 bg-paper border border-alert/30 rounded-input text-xs text-alert">
          {error}
        </div>
      )}

      {/* ── Marketplace Data Table ── */}
      {loading ? (
        /* Skeleton Loader */
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <div className="bg-paper border-b border-line py-3 px-4">
            <div className="flex gap-12">
              {["w-20", "w-24", "w-16", "w-28", "w-14", "w-20"].map((w, i) => (
                <div key={i} className={`h-3 ${w} bg-line/60 rounded-full animate-pulse`} />
              ))}
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-4 px-4 border-b border-line last:border-b-0">
              <div className="flex items-center gap-12">
                <div className="h-4 w-24 bg-line/40 rounded animate-pulse" />
                <div className="h-5 w-20 bg-line/40 rounded animate-pulse" />
                <div className="h-4 w-16 bg-line/40 rounded animate-pulse" />
                <div className="h-4 w-32 bg-line/40 rounded animate-pulse" />
                <div className="h-5 w-12 bg-line/40 rounded-full animate-pulse" />
                <div className="h-8 w-20 bg-line/40 rounded animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredAds.length === 0 ? (
        <div className="p-8 text-center bg-surface border border-line rounded-card space-y-2">
          <p className="text-sm font-medium text-ink">No ads match your criteria</p>
          <p className="text-xs text-muted">
            {ads.length === 0
              ? "There are currently no active sell ads. Switch to Alice to post one."
              : "Try clearing your amount or payment method filter."}
          </p>
          {amountFilter && (
            <button
              onClick={() => {
                setAmountFilter("");
                setPaymentFilter("ALL");
              }}
              className="mt-2 text-xs font-semibold text-moss underline"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper border-b border-line text-muted uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Price per USDT</th>
                  <th className="py-3 px-4">Available</th>
                  <th className="py-3 px-4">Order limit</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredAds.map((ad) => {
                  const isOwner = currentUser?.id === ad.sellerId;
                  return (
                    <tr key={ad.id} className="hover:bg-paper/40 transition-colors">
                      {/* Merchant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-sm">
                            {ad.sellerName}
                          </span>
                          <span className="text-[10px] text-muted">
                            • 100% (24 trades)
                          </span>
                          {isOwner && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-tag bg-paper border border-line text-muted">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price in INR */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-base text-ink tabular-nums">
                        ₹{ad.priceInr}
                      </td>

                      {/* Available USDT */}
                      <td className="py-3.5 px-4 font-mono text-ink tabular-nums">
                        {ad.remainingUsdtFormatted} <span className="text-muted text-[10px]">USDT</span>
                      </td>

                      {/* Order Limits */}
                      <td className="py-3.5 px-4 font-mono text-muted tabular-nums">
                        {ad.minUsdtFormatted} – {ad.maxUsdtFormatted} USDT
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-tag text-[11px] font-medium bg-paper border border-line text-ink">
                          {ad.paymentMethod}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenBuy(ad)}
                          disabled={isOwner}
                          className={`px-4 py-2 rounded-input text-xs font-semibold transition-colors ${
                            isOwner
                              ? "bg-paper text-muted border border-line cursor-not-allowed"
                              : "bg-moss hover:opacity-95 text-moss shadow-xs"
                          }`}
                        >
                          {isOwner ? "Your ad" : "Buy USDT"}
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

      {/* ── Buy Order Modal ── */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-line rounded-card max-w-[440px] w-full p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-semibold text-ink">
                Buy USDT from {selectedAd.sellerName}
              </h3>
              <button
                onClick={() => setSelectedAd(null)}
                className="text-muted hover:text-ink text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="bg-paper border border-line rounded-input p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Unit price:</span>
                <span className="font-mono font-medium text-ink tabular-nums">₹{selectedAd.priceInr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Seller available:</span>
                <span className="font-mono text-ink tabular-nums">{selectedAd.remainingUsdtFormatted} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Trade limits:</span>
                <span className="font-mono text-muted tabular-nums">
                  {selectedAd.minUsdtFormatted} – {selectedAd.maxUsdtFormatted} USDT
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted font-semibold mb-1">
                  Amount in USDT to buy
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="Enter USDT amount"
                    required
                    className="w-full bg-paper border border-line rounded-input py-2 px-3 text-ink font-mono text-xs focus:outline-none focus:border-moss"
                  />
                  <span className="absolute right-3 top-2 text-xs font-mono font-medium text-muted">
                    USDT
                  </span>
                </div>
              </div>

              <div className="bg-paper border border-line rounded-input p-3 flex items-center justify-between">
                <span className="text-xs text-muted">You will pay seller:</span>
                <span className="text-lg font-mono font-bold text-ink tabular-nums">
                  ₹{calculateTotalInr()}
                </span>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                Once confirmed, {selectedAd.sellerName}&apos;s USDT will be locked in platform escrow. You will have 15 minutes to transfer the INR.
              </p>

              {buyError && (
                <div className="p-2.5 bg-paper border border-alert/30 rounded-input text-xs text-alert">
                  {buyError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAd(null)}
                  className="flex-1 py-2 px-3 rounded-input border border-line text-xs font-medium text-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3 rounded-input bg-moss text-xs font-semibold disabled:opacity-40"
                >
                  {submitting ? "Locking escrow..." : "Confirm and lock escrow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
