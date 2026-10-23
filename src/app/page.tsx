"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface PreviewAd {
  id: number;
  sellerName: string;
  priceInr: string;
  remainingUsdtFormatted: string;
  minUsdtFormatted: string;
  maxUsdtFormatted: string;
  paymentMethod: string;
}

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
    <div className="space-y-16 sm:space-y-24 max-w-[1120px] mx-auto -mt-2">
      {/* ═══════════════════════════════════════════════════════
          HERO: Headline + Live Marketplace Preview side by side
         ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start pt-4 sm:pt-8">
        {/* Left: Promise */}
        <div className="space-y-6 max-w-[520px]">
          <h1 className="text-3xl sm:text-[44px] leading-[1.1] font-bold tracking-tight text-ink">
            Buy and sell USDT
            <br />
            with INR.
          </h1>
          <p className="text-base sm:text-lg text-muted leading-relaxed max-w-[460px]">
            Your crypto stays locked until you confirm the money arrived.
            No surprises, no middlemen keeping secrets.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center px-6 py-3 rounded-input bg-moss text-sm font-semibold shadow-sm hover:opacity-95"
            >
              Open marketplace
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center px-6 py-3 rounded-input border border-line text-sm font-medium text-muted hover:text-ink hover:border-ink/20"
            >
              How it works
            </a>
          </div>

          {/* Trust line */}
          <p className="text-xs text-muted pt-2">
            Demo environment — fake money only. No real crypto or INR is moved.
          </p>
        </div>

        {/* Right: Live Marketplace Preview */}
        <div className="bg-surface border border-line rounded-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 bg-paper border-b border-line">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              Live sell offers
            </span>
            <Link
              href="/marketplace"
              className="text-xs text-moss hover:underline font-medium"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-20 bg-line/40 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-line/30 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-16 bg-line/40 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : previewAds.length > 0 ? (
            <div className="divide-y divide-line">
              {previewAds.map((ad) => (
                <div key={ad.id} className="px-4 py-3.5 flex items-center justify-between hover:bg-paper/40 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{ad.sellerName}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-tag bg-paper border border-line text-muted">
                        {ad.paymentMethod}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono tabular-nums">
                      {ad.minUsdtFormatted} – {ad.maxUsdtFormatted} USDT available
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-mono font-bold text-ink tabular-nums block leading-tight">
                      ₹{ad.priceInr}
                    </span>
                    <span className="text-[10px] text-muted">per USDT</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-xs text-muted">
              No active offers right now. Switch to Alice and post a sell ad to see one here.
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          THREE-STEP TRADE FLOW STRIP
         ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="space-y-6 scroll-mt-20">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            How a trade works
          </h2>
          <p className="text-sm text-muted max-w-[520px] mx-auto">
            Three steps. No trust required between buyer and seller.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {/* Step 1: Lock */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-3 relative">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-paper border border-line text-xs font-bold text-moss font-mono">
                1
              </span>
              <h3 className="text-sm font-semibold text-ink">Lock</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Buyer picks an offer and confirms the trade.
              The seller&apos;s USDT is locked in platform escrow immediately — neither party can touch it.
            </p>
            {/* Connector line on desktop */}
            <div className="hidden sm:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-line" />
          </div>

          {/* Step 2: Pay */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-3 relative">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-paper border border-line text-xs font-bold text-moss font-mono">
                2
              </span>
              <h3 className="text-sm font-semibold text-ink">Pay</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Buyer transfers INR directly to the seller using UPI, IMPS or bank transfer.
              The buyer has 15 minutes to complete the payment and confirm.
            </p>
            <div className="hidden sm:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-line" />
          </div>

          {/* Step 3: Release */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-paper border border-line text-xs font-bold text-moss font-mono">
                3
              </span>
              <h3 className="text-sm font-semibold text-ink">Release</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Seller checks their bank, confirms the money arrived, and releases the USDT.
              The buyer&apos;s wallet is credited instantly. Trade complete.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRUST & DISPUTES SECTION
         ═══════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">
            How we handle disputes
          </h2>
          <p className="text-sm text-muted max-w-[520px] mx-auto">
            Things can go wrong. Here is exactly what happens when they do.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Escrow guarantee */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-ink">Funds never leave escrow early</h3>
            <p className="text-xs text-muted leading-relaxed">
              The seller&apos;s USDT is locked in a platform-controlled escrow account the moment a trade begins.
              Neither party can withdraw, spend, or move the locked amount until the trade reaches a terminal state.
            </p>
          </div>

          {/* Dispute process */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-ink">Dispute resolution process</h3>
            <p className="text-xs text-muted leading-relaxed">
              Either party can open a dispute after the buyer marks payment as sent.
              A platform administrator reviews payment evidence, trade chat, and bank records.
              The admin decides to release funds to the buyer or refund them to the seller.
            </p>
          </div>

          {/* Response time */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-ink">Response times</h3>
            <p className="text-xs text-muted leading-relaxed">
              For this demo, the admin user can resolve disputes immediately.
              In production, Nevora targets a first response within 30 minutes during business hours (10am–10pm IST)
              and resolution within 24 hours for straightforward cases.
            </p>
          </div>

          {/* Immutable ledger */}
          <div className="bg-surface border border-line rounded-card p-5 sm:p-6 space-y-3">
            <h3 className="text-sm font-semibold text-ink">Immutable audit trail</h3>
            <p className="text-xs text-muted leading-relaxed">
              Every movement of funds is recorded as a double-entry journal in the platform ledger.
              Ledger rows can never be edited or deleted — corrections are new reversing entries.
              Both parties and the admin can view the complete event timeline for any trade.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          RISK DISCLOSURE
         ═══════════════════════════════════════════════════════ */}
      <section className="bg-paper border border-line rounded-card p-5 sm:p-6 space-y-3 text-xs">
        <h3 className="text-sm font-semibold text-ink">Important information about P2P trading</h3>
        <div className="space-y-2 text-muted leading-relaxed">
          <p>
            P2P cryptocurrency trading involves risks that you should understand before you trade:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong className="text-ink font-medium">Bank holds and reversals.</strong>{" "}
              Banks may hold, delay, or reverse INR transfers for various reasons. If a payment is reversed after USDT is released, the platform cannot recover the crypto.
            </li>
            <li>
              <strong className="text-ink font-medium">Name mismatches.</strong>{" "}
              Always verify that the sender name on the bank transfer matches the buyer&apos;s verified name on the platform before releasing.
            </li>
            <li>
              <strong className="text-ink font-medium">Regulatory changes.</strong>{" "}
              Indian regulations on cryptocurrency may change. You are responsible for understanding and complying with applicable laws including TDS obligations.
            </li>
            <li>
              <strong className="text-ink font-medium">This is a demo.</strong>{" "}
              No real money, cryptocurrency, or personal data is involved in this prototype.
            </li>
          </ul>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════ */}
      <footer className="border-t border-line pt-8 pb-4 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          {/* Brand */}
          <div className="space-y-2">
            <span className="text-base font-bold tracking-tight text-ink">nevora</span>
            <p className="text-muted leading-relaxed">
              P2P USDT/INR marketplace with escrow.
              Calm, trustworthy, exact.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">Platform</span>
            <div className="flex flex-col gap-1.5">
              <Link href="/marketplace" className="text-muted hover:text-ink transition-colors">Marketplace</Link>
              <Link href="/create-ad" className="text-muted hover:text-ink transition-colors">Post a sell ad</Link>
              <Link href="/wallet" className="text-muted hover:text-ink transition-colors">Wallet</Link>
              <Link href="/orders" className="text-muted hover:text-ink transition-colors">My orders</Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">Legal</span>
            <div className="flex flex-col gap-1.5 text-muted">
              <span>Entity registration: pending</span>
              <span>Support: demo@nevora.example</span>
              <span>Response: within 30 minutes (demo)</span>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted">
          <span>© 2026 Nevora. Prototype — no real money.</span>
          <span>
            Cryptocurrency trading involves risk. Past performance is not indicative of future results.
          </span>
        </div>
      </footer>
    </div>
  );
}
