"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import Link from "next/link";
import { formatIndianInr } from "@/lib/tokens";
import SpotlightCard from "@/components/SpotlightCard";

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

  // Filters & Sorting
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [amountFilter, setAmountFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "available">("price_asc");

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
    return formatIndianInr(total);
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

  // Filter & Sort ads
  const filteredAds = ads
    .filter((ad) => {
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
    })
    .sort((a, b) => {
      const priceA = parseFloat(a.priceInr);
      const priceB = parseFloat(b.priceInr);
      const remA = parseFloat(a.remainingUsdtFormatted);
      const remB = parseFloat(b.remainingUsdtFormatted);

      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      if (sortBy === "available") return remB - remA;
      return 0;
    });

  return (
    <div className="space-y-6 max-w-[1120px] mx-auto">
      {/* ── Page Header & Clear Value Promise ── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink font-['Plus_Jakarta_Sans']">
          P2P Marketplace
        </h1>
        <p className="text-sm text-muted max-w-xl">
          Buy and sell USDT with INR. The seller&apos;s crypto stays safely locked in escrow until payment is confirmed in their bank.
        </p>
      </div>

      {/* ── Controls: Buy / Sell Toggle & Filters Bar ── */}
      <div className="bg-surface border border-line rounded-[24px] p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs shadow-sm">
        {/* Buy / Sell Sliding Segmented Control */}
        <div className="relative inline-flex bg-surface-subtle border border-line rounded-full p-1 self-start">
          <button
            onClick={() => setSide("buy")}
            className={`px-5 py-2 font-bold rounded-full relative z-10 transition-all ${
              side === "buy" ? "text-white" : "text-muted hover:text-ink"
            }`}
          >
            Buy USDT
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`px-5 py-2 font-bold rounded-full relative z-10 transition-all ${
              side === "sell" ? "text-white" : "text-muted hover:text-ink"
            }`}
          >
            Sell USDT
          </button>
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#7D00FF] rounded-full shadow-md shadow-purple-500/25 transition-transform duration-200"
            style={{
              transform: side === "buy" ? "translateX(0)" : "translateX(100%)",
            }}
          />
        </div>

        {/* Single Row Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Amount input filter */}
          <div className="flex items-center bg-surface-subtle border border-line rounded-full px-3.5 py-1.5 focus-within:border-[#7D00FF] transition-all">
            <span className="text-muted mr-1.5 font-medium">Amount:</span>
            <input
              type="number"
              placeholder="e.g. 50"
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              className="bg-transparent w-20 text-ink font-mono text-xs font-semibold focus:outline-none tabular-nums"
            />
            <span className="text-muted text-[10px] font-bold">USDT</span>
          </div>

          {/* Payment method selector */}
          <div className="flex items-center bg-surface-subtle border border-line rounded-full px-3.5 py-1.5">
            <span className="text-muted mr-1.5 font-medium">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-transparent text-ink text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-surface">All methods</option>
              <option value="UPI" className="bg-surface">UPI</option>
              <option value="IMPS" className="bg-surface">IMPS</option>
              <option value="Bank Transfer" className="bg-surface">Bank Transfer</option>
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center bg-surface-subtle border border-line rounded-full px-3.5 py-1.5">
            <span className="text-muted mr-1.5 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-ink text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="price_asc" className="bg-surface">Lowest price</option>
              <option value="price_desc" className="bg-surface">Highest price</option>
              <option value="available" className="bg-surface">Most available</option>
            </select>
          </div>

          <button
            onClick={fetchAds}
            className="px-4 py-1.5 text-xs font-semibold text-muted hover:text-ink border border-line rounded-full bg-surface hover:bg-surface-subtle ml-auto sm:ml-0 transition-colors"
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
            className="inline-block mt-1 px-4 py-2 bg-moss text-white text-xs font-semibold rounded-input btn-press"
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
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <div className="bg-paper border-b border-line py-3 px-4">
            <div className="flex gap-12">
              {["w-20", "w-24", "w-16", "w-28", "w-14", "w-20"].map((w, i) => (
                <div key={i} className={`h-3 ${w} rounded-full skeleton-shimmer`} />
              ))}
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-4 px-4 border-b border-line last:border-b-0">
              <div className="flex items-center gap-12">
                <div className="h-4 w-24 rounded skeleton-shimmer" />
                <div className="h-5 w-20 rounded skeleton-shimmer" />
                <div className="h-4 w-16 rounded skeleton-shimmer" />
                <div className="h-4 w-32 rounded skeleton-shimmer" />
                <div className="h-5 w-12 rounded-full skeleton-shimmer" />
                <div className="h-8 w-20 rounded skeleton-shimmer ml-auto" />
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
        <div className="space-y-4">
          {/* Mobile Card View (< sm) */}
          <div className="sm:hidden space-y-3">
            {filteredAds.map((ad) => {
              const isOwner = currentUser?.id === ad.sellerId;
              return (
                <SpotlightCard
                  key={ad.id}
                  className="p-4 space-y-2.5"
                  spotlightColor="rgba(124, 58, 237, 0.10)"
                  borderColor="rgba(167, 139, 250, 0.4)"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm">{ad.sellerName}</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50">
                        ✓ 100%
                      </span>
                      {isOwner && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 text-purple-700 dark:text-purple-300">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-base text-ink tabular-nums">
                        ₹{ad.priceInr}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-muted">
                    <span>Avail: {ad.remainingUsdtFormatted} USDT</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 text-purple-700 dark:text-purple-300 font-sans text-[11px] font-semibold">
                      {ad.paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted font-mono">
                      Limit: {ad.minUsdtFormatted} – {ad.maxUsdtFormatted}
                    </span>
                    <button
                      onClick={() => handleOpenBuy(ad)}
                      disabled={isOwner}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        isOwner
                          ? "bg-surface-subtle text-muted border border-line cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-600/25 active:scale-[0.98]"
                      }`}
                    >
                      {isOwner ? "Your ad" : "Buy USDT"}
                    </button>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>

          {/* Desktop Table View (>= sm) */}
          <div className="hidden sm:block bg-surface border border-line rounded-[24px] overflow-hidden shadow-sm transition-opacity duration-150">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="bg-surface-subtle border-b border-line text-muted uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Merchant</th>
                  <th className="py-3.5 px-5">Price per USDT</th>
                  <th className="py-3.5 px-5">Available</th>
                  <th className="py-3.5 px-5">Order limit</th>
                  <th className="py-3.5 px-5">Payment</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredAds.map((ad) => {
                  const isOwner = currentUser?.id === ad.sellerId;
                  return (
                    <tr
                      key={ad.id}
                      className="group hover:bg-surface-subtle/50 transition-colors"
                    >
                      {/* Merchant */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm">
                            {ad.sellerName}
                          </span>
                          <span className="text-[10px] text-[#00C278] font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                            ✓ 100% (24 trades)
                          </span>
                          {isOwner && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-subtle border border-line text-muted font-medium">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price in INR */}
                      <td className="py-4 px-5 font-mono font-bold text-base text-ink tabular-nums">
                        ₹{ad.priceInr}
                      </td>

                      {/* Available USDT */}
                      <td className="py-4 px-5 font-mono text-ink tabular-nums font-medium">
                        {ad.remainingUsdtFormatted} <span className="text-muted text-[10px]">USDT</span>
                      </td>

                      {/* Order Limits */}
                      <td className="py-4 px-5 font-mono text-muted tabular-nums">
                        {ad.minUsdtFormatted} – {ad.maxUsdtFormatted} USDT
                      </td>

                      {/* Payment Method */}
                      <td className="py-4 px-5">
                        <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-surface-subtle border border-line text-ink">
                          {ad.paymentMethod}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleOpenBuy(ad)}
                          disabled={isOwner}
                          className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                            isOwner
                              ? "bg-surface-subtle text-muted border border-line cursor-not-allowed"
                              : "btn-moonpay shadow-md shadow-purple-500/20 active:scale-[0.98]"
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
      </div>
    )}

      {/* ── Buy Order Modal ── */}
      {selectedAd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            className="bg-surface border border-line rounded-[28px] max-w-[440px] w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-fade-up relative"
            style={{
              animation: "fadeUp 200ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
            }}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink font-['Plus_Jakarta_Sans']">
                Buy USDT from {selectedAd.sellerName}
              </h3>
              <button
                onClick={() => setSelectedAd(null)}
                className="w-7 h-7 rounded-full bg-surface-subtle border border-line flex items-center justify-center text-muted hover:text-ink text-xs transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="bg-surface-subtle border border-line rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted font-medium">Unit price:</span>
                <span className="font-mono font-bold text-ink tabular-nums">₹{selectedAd.priceInr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Seller available:</span>
                <span className="font-mono font-semibold text-ink tabular-nums">{selectedAd.remainingUsdtFormatted} USDT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Trade limits:</span>
                <span className="font-mono text-muted tabular-nums">
                  {selectedAd.minUsdtFormatted} – {selectedAd.maxUsdtFormatted} USDT
                </span>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted font-bold mb-1.5">
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
                    className="w-full bg-surface-subtle border border-line rounded-2xl py-3 px-4 text-ink font-mono text-base font-bold focus:outline-none focus:border-[#7D00FF] tabular-nums transition-colors"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-mono font-bold text-[#7D00FF]">
                    USDT
                  </span>
                </div>
              </div>

              <div className="bg-surface-subtle border border-line rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs text-muted font-medium">You will pay seller:</span>
                <span className="text-xl font-mono font-extrabold text-[#7D00FF] tabular-nums">
                  {calculateTotalInr()}
                </span>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                Once confirmed, {selectedAd.sellerName}&apos;s USDT will be locked instantly in smart platform escrow. You will transfer the INR directly to their bank/UPI account.
              </p>

              {buyError && (
                <div className="p-3 bg-red-500/10 border border-alert/30 rounded-2xl text-xs text-alert font-medium animate-shake">
                  {buyError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAd(null)}
                  className="flex-1 py-3 px-4 rounded-full border border-line bg-surface text-xs font-bold text-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-full btn-moonpay text-xs font-bold disabled:opacity-40 shadow-lg shadow-purple-500/25"
                >
                  {submitting ? "Locking escrow..." : "Confirm & Lock Escrow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
