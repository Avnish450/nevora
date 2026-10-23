"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { formatIndianInr, formatUsdtDisplayString } from "@/lib/tokens";
import SpotlightCard from "@/components/SpotlightCard";
import ShimmerButton from "@/components/ShimmerButton";

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
    <SpotlightCard
      className="p-6 sm:p-7 shadow-xl shadow-purple-500/10 space-y-5 max-w-[420px] w-full border-purple-200/70 dark:border-purple-900/50"
      spotlightColor="rgba(124, 58, 237, 0.12)"
      borderColor="rgba(147, 51, 234, 0.35)"
    >
      {/* Subtle top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-purple-500/15 blur-2xl pointer-events-none rounded-full" />

      {/* Buy / Sell Sliding Segmented Toggle */}
      <div className="p-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 rounded-full flex relative">
        <button
          type="button"
          onClick={() => setTab("buy")}
          className={`flex-1 py-2 text-xs font-bold rounded-full transition-all relative z-10 ${
            tab === "buy" ? "text-white" : "text-purple-900 dark:text-purple-300 hover:text-purple-700"
          }`}
        >
          Buy USDT
        </button>
        <button
          type="button"
          onClick={() => setTab("sell")}
          className={`flex-1 py-2 text-xs font-bold rounded-full transition-all relative z-10 ${
            tab === "sell" ? "text-white" : "text-purple-900 dark:text-purple-300 hover:text-purple-700"
          }`}
        >
          Sell USDT
        </button>
        {/* Sliding active pill (200ms) with Animmaster purple */}
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-purple-600 to-violet-600 rounded-full shadow-md shadow-purple-500/30 transition-transform duration-200"
          style={{
            transform: tab === "buy" ? "translateX(0)" : "translateX(100%)",
          }}
        />
      </div>

      {/* You Pay (INR) Container */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted font-semibold tracking-wide">You pay</span>
          <span className="text-muted text-[11px] font-medium">Instant transfer</span>
        </div>
        <div className="bg-surface-subtle border border-line rounded-2xl p-4 focus-within:border-[#7D00FF] transition-all flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-muted font-mono">₹</span>
              <input
                type="number"
                value={inrAmount}
                onChange={(e) => setInrAmount(e.target.value)}
                placeholder="5000"
                className="bg-transparent text-2xl sm:text-3xl font-mono font-bold text-ink focus:outline-none w-full tabular-nums"
                min="100"
              />
            </div>
            <span className="text-[11px] text-muted block mt-0.5">Min ₹500 · Max ₹2,00,000</span>
          </div>

          {/* Currency Badge */}
          <div className="flex items-center gap-2 bg-surface border border-line px-3 py-1.5 rounded-full shadow-xs shrink-0">
            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
              ₹
            </span>
            <span className="text-xs font-bold text-ink">INR</span>
          </div>
        </div>
      </div>

      {/* Inverted Rate & Swap Divider */}
      <div className="relative flex items-center justify-center py-0.5">
        <div className="w-full border-t border-line/60" />
        <div className="absolute bg-surface border border-line rounded-full p-1.5 shadow-sm hover:border-[#7D00FF] text-muted hover:text-[#7D00FF] transition-colors cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </div>
      </div>

      {/* You Receive (USDT) Container */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-muted font-semibold tracking-wide">You receive</span>
          <span className="text-[11px] font-semibold text-[#00C278] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C278] animate-pulse" />
            Zero fee
          </span>
        </div>
        <div className="bg-surface-subtle border border-line rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-ink tabular-nums">
              {receiveUsdt}
            </div>
            <span className="text-[11px] text-muted block mt-0.5">Deposited directly to Escrow</span>
          </div>

          {/* Token Selector Badge */}
          <div className="flex items-center gap-2 bg-surface border border-line px-3 py-1.5 rounded-full shadow-xs shrink-0">
            {/* Tether Green Token Icon */}
            <div className="w-5 h-5 rounded-full bg-[#00C278] text-white flex items-center justify-center font-bold text-[10px]">
              ₮
            </div>
            <span className="text-xs font-bold text-ink">USDT</span>
            <span className="text-[10px] text-muted">▾</span>
          </div>
        </div>
      </div>

      {/* Network Chips */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] px-1">
          <span className="font-semibold text-muted">Network</span>
          <span className="text-muted font-mono">{selectedNetwork} standard</span>
        </div>
        <div className="flex gap-2">
          {["TRC20", "BEP20", "ERC20"].map((net) => (
            <button
              key={net}
              type="button"
              onClick={() => setSelectedNetwork(net)}
              className={`flex-1 py-1.5 px-2 rounded-full text-xs font-mono font-semibold border transition-all ${
                selectedNetwork === net
                  ? "bg-purple-50 dark:bg-purple-950/50 border-[#7D00FF] text-[#7D00FF] shadow-xs"
                  : "bg-surface border-line text-muted hover:text-ink hover:border-line/80"
              }`}
            >
              {net}
            </button>
          ))}
        </div>
      </div>

      {/* Rate & Refresh bar */}
      <div className="p-3 bg-surface-subtle border border-line rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted text-[11px]">1 USDT ≈</span>
          <span className="font-mono font-bold text-ink tabular-nums text-sm">
            ₹{rateInr.toFixed(2)}
          </span>
        </div>

        {/* 30-Second Refresh SVG Ring */}
        <div className="flex items-center gap-2 text-muted text-[11px]" title="Rate refreshed every 30s">
          <span className="text-[10px] font-medium hidden sm:inline">Auto-refresh</span>
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
              stroke="#7D00FF"
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

      {/* Animmaster Shimmer CTA Button */}
      <Link
        href={`/marketplace`}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all relative overflow-hidden group"
      >
        <span className="absolute inset-0 block h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[250%] duration-1000 transition-transform pointer-events-none" />
        <span className="relative z-10 flex items-center gap-2">
          <span>{tab === "buy" ? "Continue to Buy USDT" : "Continue to Sell USDT"}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </span>
      </Link>

      {/* Trust Guarantee */}
      <div className="flex items-center justify-center gap-2 text-[11px] text-muted text-center pt-0.5">
        <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zm3.707 6.763a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Protected by platform escrow · Instant settlement</span>
      </div>
    </SpotlightCard>
  );
}
