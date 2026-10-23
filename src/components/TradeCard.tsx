"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatIndianInr, formatUsdtDisplayString } from "@/lib/tokens";

interface Ad {
  id: number;
  seller_name: string;
  price_inr_paise: number;
  remaining_usdt: string;
  min_usdt: string;
  max_usdt: string;
  priceInr: string;
  remainingUsdtFormatted: string;
  minUsdtFormatted: string;
  maxUsdtFormatted: string;
}

export default function TradeCard() {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [inrAmount, setInrAmount] = useState<string>("5000");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("TRC20");
  const [bestAd, setBestAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [ringProgress, setRingProgress] = useState(100);

  // Fetch real best ad from API
  const fetchBestAd = async () => {
    try {
      const res = await fetch("/api/ads");
      if (res.ok) {
        const data = await res.json();
        const activeAds: Ad[] = (data.ads || []).filter(
          (a: Ad) => parseFloat(a.remainingUsdtFormatted) > 0
        );
        if (activeAds.length > 0) {
          // Sort lowest price for buyer
          activeAds.sort(
            (a, b) => a.price_inr_paise - b.price_inr_paise
          );
          setBestAd(activeAds[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch ads", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBestAd();
  }, []);

  // 30-second rate-refresh ring animation
  useEffect(() => {
    const startTime = Date.now();
    const duration = 30000;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) % duration;
      const remainingPct = 100 - (elapsed / duration) * 100;
      setRingProgress(remainingPct);

      if (remainingPct > 99) {
        fetchBestAd();
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Compute USDT receive calculation based on real best ad
  const rateInr = bestAd ? parseFloat(bestAd.priceInr) : 88.0;

  const receiveUsdt = useMemo(() => {
    const parsedInr = parseFloat(inrAmount) || 0;
    if (rateInr <= 0 || parsedInr <= 0) return "0.00";
    return formatUsdtDisplayString((parsedInr / rateInr).toFixed(2));
  }, [inrAmount, rateInr]);

  return (
    <div className="bg-surface border border-line rounded-card p-6 shadow-sm space-y-5 max-w-md w-full">
      {/* Buy / Sell Sliding Segmented Toggle */}
      <div className="p-1 bg-paper border border-line rounded-input flex relative">
        <button
          type="button"
          onClick={() => setTab("buy")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-input transition-colors relative z-10 ${
            tab === "buy" ? "text-ink shadow-xs" : "text-muted hover:text-ink"
          }`}
        >
          Buy USDT
        </button>
        <button
          type="button"
          onClick={() => setTab("sell")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-input transition-colors relative z-10 ${
            tab === "sell" ? "text-ink shadow-xs" : "text-muted hover:text-ink"
          }`}
        >
          Sell USDT
        </button>
        {/* Sliding active pill (200ms) */}
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface border border-line rounded-input transition-transform duration-200"
          style={{
            transform: tab === "buy" ? "translateX(0)" : "translateX(100%)",
          }}
        />
      </div>

      {/* Pay In INR Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted font-medium">You pay</span>
          <span className="text-muted text-[11px]">Instant UPI / IMPS</span>
        </div>
        <div className="flex items-center justify-between bg-paper border border-line rounded-input px-3.5 py-2.5 focus-within:border-moss transition-colors">
          <div className="flex items-center gap-1">
            <span className="text-muted font-mono font-medium">₹</span>
            <input
              type="number"
              value={inrAmount}
              onChange={(e) => setInrAmount(e.target.value)}
              placeholder="5000"
              className="bg-transparent text-lg font-mono font-semibold text-ink focus:outline-none w-36 tabular-nums"
              min="100"
            />
          </div>
          <span className="text-xs font-semibold text-ink px-2 py-1 bg-surface border border-line rounded-input">
            INR
          </span>
        </div>
      </div>

      {/* You Receive In USDT Preview with 200ms number tween */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted font-medium">You receive</span>
          <span className="text-muted text-[11px]">In Nevora Escrow</span>
        </div>
        <div className="flex items-center justify-between bg-paper border border-line rounded-input px-3.5 py-2.5">
          <span className="text-lg font-mono font-bold text-ink tabular-nums transition-all duration-200">
            {receiveUsdt}
          </span>
          <span className="text-xs font-semibold text-moss px-2 py-1 bg-surface border border-line rounded-input">
            USDT
          </span>
        </div>
      </div>

      {/* Network Chips (TRC20, BEP20, ERC20) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-muted block">Settlement Network</span>
        <div className="flex gap-2">
          {["TRC20", "BEP20", "ERC20"].map((net) => (
            <button
              key={net}
              type="button"
              onClick={() => setSelectedNetwork(net)}
              className={`flex-1 py-1.5 px-2 rounded-input text-xs font-mono font-medium border transition-colors ${
                selectedNetwork === net
                  ? "bg-paper border-moss text-moss font-semibold"
                  : "bg-surface border-line text-muted hover:text-ink"
              }`}
            >
              {net}
            </button>
          ))}
        </div>
      </div>

      {/* Live Best Ad & Rate with 30s Countdown Ring */}
      <div className="p-3 bg-paper border border-line rounded-input flex items-center justify-between text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Best Rate:</span>
            <span className="font-mono font-bold text-ink tabular-nums">
              ₹{rateInr.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted font-sans">/ USDT</span>
          </div>
          <div className="text-[11px] text-muted">
            by{" "}
            <strong className="text-ink font-medium">
              {bestAd ? bestAd.seller_name : "Alice"}
            </strong>{" "}
            (100% completion)
          </div>
        </div>

        {/* 30-Second Refresh SVG Ring */}
        <div className="flex items-center gap-1.5 text-muted" title="Rate refreshes every 30s">
          <svg width="18" height="18" viewBox="0 0 24 24" className="rotate-[-90deg]">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="var(--line)"
              strokeWidth="2.5"
              fill="none"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="var(--moss)"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="62.8"
              strokeDashoffset={62.8 - (62.8 * ringProgress) / 100}
              style={{
                transition: "stroke-dashoffset 200ms linear",
              }}
            />
          </svg>
        </div>
      </div>

      {/* CTA Button */}
      <Link
        href={`/marketplace`}
        className="w-full flex items-center justify-center py-3 rounded-input bg-moss text-white font-semibold text-sm hover:opacity-95 transition-opacity btn-press shadow-xs"
      >
        {tab === "buy" ? "Buy USDT with 0% fee" : "Sell USDT safely"}
      </Link>

      <p className="text-[11px] text-center text-muted">
        Zero trading fees · Funds locked in audited platform escrow
      </p>
    </div>
  );
}
