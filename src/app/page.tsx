"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TradeCard from "@/components/TradeCard";
import StepperCarousel from "@/components/StepperCarousel";
import MarqueeRow from "@/components/MarqueeRow";
import Accordion, { AccordionItem } from "@/components/Accordion";

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
    <div className="space-y-16 sm:space-y-24 max-w-[1120px] mx-auto">
      {/* ═══════════════════════════════════════════════════════
          HERO: Left: Promise headline & trust note
                Right: Interactive MoonPay-inspired Trade Card
         ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-2 sm:pt-6">
        {/* Left: Plain-language promise */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-tag bg-surface border border-line text-xs font-medium text-ink shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-buy inline-block" />
            <span>Zero platform fees · Automated escrow protection</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.12]">
            Buy and sell USDT with INR.
          </h1>

          <p className="text-base sm:text-lg text-muted leading-relaxed max-w-xl">
            Your crypto stays locked in platform escrow until you confirm the money
            arrived in your bank. No surprises, no middlemen keeping secrets.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-input bg-moss text-white text-sm font-semibold shadow-xs hover:opacity-95 transition-opacity btn-press"
            >
              Open marketplace
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-6 py-3.5 rounded-input border border-line bg-surface text-sm font-medium text-ink hover:bg-paper transition-colors btn-press"
            >
              How escrow works
            </a>
          </div>

          {/* Small Trust Note */}
          <div className="pt-2 flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="text-buy font-bold">✓</span> Direct P2P settlement
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="text-buy font-bold">✓</span> Zero-sum double-entry ledger
            </span>
          </div>
        </div>

        {/* Right: Live Interactive Trade Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <TradeCard />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRUST STRIP: Proof points placed right below the hero
         ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-card bg-surface border border-line shadow-xs">
        <div className="space-y-1">
          <span className="font-mono text-2xl font-bold text-ink tabular-nums">0%</span>
          <p className="text-xs text-muted">Platform trading fee</p>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-2xl font-bold text-ink tabular-nums">100%</span>
          <p className="text-xs text-muted">Escrow locked balance</p>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-2xl font-bold text-ink tabular-nums">&lt; 3 min</span>
          <p className="text-xs text-muted">Average settlement time</p>
        </div>
        <div className="space-y-1">
          <span className="font-mono text-2xl font-bold text-ink tabular-nums">24/7</span>
          <p className="text-xs text-muted">UPI & IMPS transfers</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CHIP ROW: Slow continuous looping marquee (40s linear)
         ═══════════════════════════════════════════════════════ */}
      <MarqueeRow />

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS: 4-Step Stepper Carousel
         ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            How a Nevora trade works
          </h2>
          <p className="text-sm text-muted max-w-xl">
            Four simple steps. Escrow locks the seller&apos;s crypto at step one, so your funds are never at risk while you pay.
          </p>
        </div>

        <StepperCarousel />
      </section>

      {/* ═══════════════════════════════════════════════════════
          ESCROW EXPLAINER: Simple visual diagram
         ═══════════════════════════════════════════════════════ */}
      <section className="bg-surface border border-line rounded-card p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="space-y-1">
          <span className="text-xs uppercase tracking-wider text-muted font-mono font-semibold">
            Security Architecture
          </span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            The Nevora escrow guarantee
          </h3>
          <p className="text-xs sm:text-sm text-muted max-w-2xl">
            Neither party can cheat the other. The crypto is held independently until bank confirmation is recorded.
          </p>
        </div>

        {/* Visual Escrow Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-input bg-paper border border-line space-y-2">
            <div className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center font-mono text-xs font-bold text-ink">
              1
            </div>
            <h4 className="text-sm font-semibold text-ink">Seller locks USDT</h4>
            <p className="text-xs text-muted leading-relaxed">
              When an order is created, the seller&apos;s USDT moves from available balance into locked platform escrow.
            </p>
          </div>

          <div className="p-4 rounded-input bg-paper border border-line space-y-2 relative">
            <div className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center font-mono text-xs font-bold text-moss">
              2
            </div>
            <h4 className="text-sm font-semibold text-ink">Buyer transfers INR</h4>
            <p className="text-xs text-muted leading-relaxed">
              The buyer pays the seller directly via UPI or IMPS. No bank intermediary or platform fee is deducted.
            </p>
          </div>

          <div className="p-4 rounded-input bg-paper border border-line space-y-2">
            <div className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center font-mono text-xs font-bold text-buy">
              3
            </div>
            <h4 className="text-sm font-semibold text-ink">Automated release</h4>
            <p className="text-xs text-muted leading-relaxed">
              Once payment is received, seller releases the trade. The escrow unlocks and deposits USDT to the buyer.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          LIVE MARKETPLACE PREVIEW TABLE
         ═══════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight text-ink">
              Live market offers
            </h3>
            <p className="text-xs text-muted">
              Real offers from verified sellers. Prices update in real time.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="text-xs font-semibold text-moss hover:underline"
          >
            View all ads →
          </Link>
        </div>

        <div className="bg-surface border border-line rounded-card overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-6 text-center text-xs font-mono text-muted">
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
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-paper/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {ad.seller_name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-tag bg-paper border border-line font-medium text-muted">
                        {ad.payment_method}
                      </span>
                    </div>
                    <div className="text-xs text-muted font-mono">
                      Limit: {ad.minUsdtFormatted} – {ad.maxUsdtFormatted} USDT
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-ink tabular-nums">
                        ₹{ad.priceInr}
                      </div>
                      <div className="text-[10px] text-muted font-sans">per USDT</div>
                    </div>
                    <Link
                      href="/marketplace"
                      className="px-4 py-2 rounded-input bg-moss text-white text-xs font-semibold hover:opacity-95 transition-opacity btn-press"
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
