"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TradeCard from "@/components/TradeCard";
import StepperCarousel from "@/components/StepperCarousel";
import MarqueeRow from "@/components/MarqueeRow";
import Accordion, { AccordionItem } from "@/components/Accordion";
import SpotlightCard from "@/components/SpotlightCard";
import ShimmerBadge from "@/components/ShimmerBadge";
import AuroraBackground from "@/components/AuroraBackground";

interface PreviewAd {
  id: number;
  seller_name: string;
  priceInr: string;
  remainingUsdtFormatted: string;
  minUsdtFormatted: string;
  maxUsdtFormatted: string;
  payment_method: string;
}

const FAQ_ITEMS: AccordionItem[] = [
  {
    id: "faq-escrow",
    question: "How does Nevora's escrow protect my trade?",
    answer:
      "When a buyer initiates an order, the seller's USDT is immediately deducted from their available balance and locked in platform escrow. The seller cannot withdraw or double-spend this USDT. It is only released to the buyer after the seller confirms receipt of the INR in their bank account, or by an admin in case of dispute.",
  },
  {
    id: "faq-fees",
    question: "What are the platform trading fees?",
    answer:
      "Nevora charges 0% trading fees for peer-to-peer trades. Buyers pay the exact agreed INR price, and sellers receive the full amount directly to their bank account via UPI or IMPS.",
  },
  {
    id: "faq-bank-holds",
    question: "What if the buyer claims payment but no INR arrived?",
    answer:
      "Never release USDT before verifying funds in your bank or UPI app. If the buyer marks the trade as 'Paid' but funds have not cleared, do not release. Open a dispute immediately. An administrator will inspect bank statements and transaction IDs before making an arbitration ruling.",
  },
  {
    id: "faq-limits",
    question: "What are the order limits and settlement times?",
    answer:
      "Each merchant sets their own minimum and maximum order limits. Typical trades settle within 2 to 5 minutes once payment is initiated. In demo mode, buyers have a 2-minute payment window before the order expires automatically.",
  },
  {
    id: "faq-disputes",
    question: "How does the dispute arbitration process work?",
    answer:
      "Either party can raise a dispute after payment is marked. Funds remain completely locked in platform escrow while our administrative desk reviews payment reference numbers (UTR/UPI reference). If valid payment is proven, funds release to the buyer; otherwise, they return to the seller.",
  },
];

export default function HomePage() {
  const [previewAds, setPreviewAds] = useState<PreviewAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ads")
      .then((r) => r.json())
      .then((data) => setPreviewAds((data.ads || []).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-16 sm:space-y-24 max-w-[1160px] mx-auto">
      {/* ═══════════════════════════════════════════════════════
          HERO: Animmaster Aurora Background + Headline & Widget
         ═══════════════════════════════════════════════════════ */}
      <AuroraBackground className="rounded-3xl p-4 sm:p-8 -mx-2 sm:-mx-6">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left: Friendly Headline & Value Proposition */}
          <div className="lg:col-span-7 space-y-6">
            <ShimmerBadge dotColor="bg-purple-600">
              <span>0% Trading Fees · Bank-Grade Escrow Vault</span>
            </ShimmerBadge>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-ink leading-[1.08] font-['Plus_Jakarta_Sans']">
              Your safe bridge to{" "}
              <span className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                P2P crypto.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-muted leading-relaxed max-w-xl font-normal">
              The simplest, friendliest way to buy and sell USDT with Indian Rupees. 
              Funds stay locked in double-entry escrow until money arrives in your bank.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/marketplace"
                className="px-8 py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 text-white shadow-xl shadow-purple-600/30 hover:shadow-2xl hover:shadow-purple-600/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all relative overflow-hidden group"
              >
                <span className="absolute inset-0 block h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[250%] duration-1000 transition-transform pointer-events-none" />
                <span className="relative z-10 flex items-center gap-2">
                  <span>Explore Marketplace</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-6 py-4 rounded-full border border-purple-200/80 dark:border-purple-800/60 bg-white/80 dark:bg-purple-950/20 text-sm font-semibold text-ink hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all shadow-xs"
              >
                How Escrow Works
              </a>
            </div>

            {/* Trust Guarantees */}
            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-muted font-medium">
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span>Direct Bank & UPI Settlement</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span>Double-Entry Ledger</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span>Zero Counterparty Risk</span>
              </span>
            </div>
          </div>

          {/* Right: Live Interactive Trade Widget */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <TradeCard />
          </div>
        </section>
      </AuroraBackground>

      {/* ═══════════════════════════════════════════════════════
          TRUST STRIP: MoonPay Style Metrics
         ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 rounded-[28px] bg-surface border border-line shadow-sm">
        <div className="space-y-1">
          <span className="font-mono text-3xl font-extrabold text-[#7D00FF] tabular-nums">0%</span>
          <p className="text-xs font-medium text-muted">Platform Trading Fee</p>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-3xl font-extrabold text-ink tabular-nums">100%</span>
          <p className="text-xs font-medium text-muted">Escrow Lock Guarantee</p>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-3xl font-extrabold text-ink tabular-nums">&lt; 3 min</span>
          <p className="text-xs font-medium text-muted">Avg. Settlement Time</p>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-3xl font-extrabold text-[#00C278] tabular-nums">24/7</span>
          <p className="text-xs font-medium text-muted">Instant UPI & IMPS</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CHIP ROW: Continuous looping marquee
         ═══════════════════════════════════════════════════════ */}
      <MarqueeRow />

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS: 4-Step Stepper Carousel
         ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="space-y-6">
        <div className="space-y-2 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7D00FF] font-mono">
            Effortless Trading
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink font-['Plus_Jakarta_Sans']">
            How a Nevora trade works
          </h2>
          <p className="text-sm sm:text-base text-muted">
            Four simple steps. Escrow locks the seller&apos;s crypto at step one, so your funds are never at risk while you pay.
          </p>
        </div>

        <StepperCarousel />
      </section>

      {/* ═══════════════════════════════════════════════════════
          ESCROW EXPLAINER: Animmaster 3-Box Architecture with Spotlight
         ═══════════════════════════════════════════════════════ */}
      <section className="bg-white/80 dark:bg-[#120E22]/80 border border-purple-100/90 dark:border-purple-900/50 rounded-[32px] p-6 sm:p-10 space-y-8 shadow-sm backdrop-blur-xs">
        <div className="space-y-2 text-center sm:text-left">
          <span className="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 font-mono font-bold">
            Security Architecture
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-['Plus_Jakarta_Sans']">
            The Nevora escrow guarantee
          </h3>
          <p className="text-sm text-muted max-w-2xl">
            Neither party can cheat the other. Crypto is held independently in automated platform escrow until bank settlement is recorded.
          </p>
        </div>

        {/* Visual Escrow Flow Diagram with Animmaster Spotlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <SpotlightCard
            className="p-6 space-y-3"
            spotlightColor="rgba(124, 58, 237, 0.12)"
            borderColor="rgba(167, 139, 250, 0.5)"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-center font-mono text-sm font-bold text-purple-600 dark:text-purple-400 shadow-xs">
              01
            </div>
            <h4 className="text-base font-bold text-ink">Seller locks USDT</h4>
            <p className="text-xs text-muted leading-relaxed">
              When an order is created, the seller&apos;s USDT moves instantly from available balance into locked platform escrow.
            </p>
          </SpotlightCard>

          <SpotlightCard
            className="p-6 space-y-3"
            spotlightColor="rgba(124, 58, 237, 0.12)"
            borderColor="rgba(167, 139, 250, 0.5)"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 flex items-center justify-center font-mono text-sm font-bold text-purple-600 dark:text-purple-400 shadow-xs">
              02
            </div>
            <h4 className="text-base font-bold text-ink">Buyer transfers INR</h4>
            <p className="text-xs text-muted leading-relaxed">
              The buyer pays the seller directly via UPI or IMPS. No bank intermediary or platform fee is deducted.
            </p>
          </SpotlightCard>

          <SpotlightCard
            className="p-6 space-y-3"
            spotlightColor="rgba(16, 185, 129, 0.10)"
            borderColor="rgba(52, 211, 153, 0.45)"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 shadow-xs">
              03
            </div>
            <h4 className="text-base font-bold text-ink">Instant Release</h4>
            <p className="text-xs text-muted leading-relaxed">
              Once payment is received, seller releases the trade. The escrow unlocks and deposits USDT directly to the buyer.
            </p>
          </SpotlightCard>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          LIVE MARKETPLACE PREVIEW TABLE
         ═══════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-2xl font-extrabold tracking-tight text-ink font-['Plus_Jakarta_Sans']">
              Live market offers
            </h3>
            <p className="text-xs text-muted">
              Real offers from verified sellers. Prices update in real time.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="text-xs font-bold text-[#7D00FF] hover:underline flex items-center gap-1"
          >
            <span>View all ads</span>
            <span>→</span>
          </Link>
        </div>

        <div className="bg-surface border border-line rounded-[28px] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-muted">
              Loading active offers...
            </div>
          ) : previewAds.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              No active offers at the moment. You can post an ad to sell USDT.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {previewAds.map((ad) => (
                <div
                  key={ad.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-subtle/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-ink">
                        {ad.seller_name}
                      </span>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface-subtle border border-line font-semibold text-muted">
                        {ad.payment_method}
                      </span>
                    </div>
                    <div className="text-xs text-muted font-mono">
                      Limit: {ad.minUsdtFormatted} – {ad.maxUsdtFormatted} USDT
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold text-ink tabular-nums">
                        ₹{ad.priceInr}
                      </div>
                      <div className="text-[10px] text-muted font-sans font-medium">per USDT</div>
                    </div>
                    <Link
                      href="/marketplace"
                      className="btn-moonpay px-5 py-2.5 text-xs font-bold shadow-md shadow-purple-500/20"
                    >
                      Buy USDT
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FAQ ACCORDION: Measured height animation (220ms)
         ═══════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold tracking-tight text-ink">
            Frequently asked questions
          </h3>
          <p className="text-sm text-muted">
            Clear, honest answers about P2P trades, bank holds, disputes, and escrow safety.
          </p>
        </div>

        <Accordion items={FAQ_ITEMS} />
      </section>

      {/* ═══════════════════════════════════════════════════════
          RISK DISCLOSURE & LEGAL FOOTER
         ═══════════════════════════════════════════════════════ */}
      <section className="pt-8 border-t border-line text-xs text-muted space-y-3 leading-relaxed">
        <h4 className="font-semibold text-ink uppercase tracking-wider text-[11px]">
          Risk Disclosure & Demo Disclaimer
        </h4>
        <p>
          Nevora is a demonstrated prototype showcasing peer-to-peer cryptocurrency escrow architecture and immutable double-entry ledger bookkeeping. This environment operates exclusively with simulated funds. No real Indian Rupees or real Tether (USDT) on public blockchains are transferred or handled.
        </p>
        <p>
          Cryptocurrency transactions carry inherent risks. In real trading, always verify the sender&apos;s legal name matches their KYC profile before releasing escrow.
        </p>
      </section>
    </div>
  );
}
