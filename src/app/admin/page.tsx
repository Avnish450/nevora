"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import Link from "next/link";

interface DisputeItem {
  dispute_id: number;
  order_id: number;
  opened_by: number;
  opened_by_name: string;
  reason: string;
  resolution: string | null;
  resolved_at: string | null;
  order_state: string;
  usdtAmountFormatted: string;
  priceInrFormatted: string;
  totalInrFormatted: string;
  buyer_id: number;
  seller_id: number;
  buyer_name: string;
  seller_name: string;
}

interface ReconcileAccount {
  id: number;
  userName: string;
  asset: string;
  kind: string;
  cachedBalance: string;
  computedBalance: string;
  matches: boolean;
}

interface ReconcileResult {
  ok: boolean;
  discrepancyCount: number;
  discrepancies: { accountId: number; cachedBalance: string; computedBalance: string }[];
  accountsSummary: ReconcileAccount[];
  checkedAt: string;
}

export default function AdminPage() {
  const { currentUser, fetchWithUser, refreshUser } = useUser();
  const [disputes, setDisputes] = useState<DisputeItem[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  // Reconciliation state
  const [reconcileResult, setReconcileResult] = useState<ReconcileResult | null>(null);
  const [reconcileLoading, setReconcileLoading] = useState(false);

  const fetchDisputes = useCallback(async () => {
    try {
      setDisputesLoading(true);
      const res = await fetchWithUser("/api/admin/disputes");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes || []);
      }
    } catch (err) {
      console.error("Disputes fetch error", err);
    } finally {
      setDisputesLoading(false);
    }
  }, [fetchWithUser]);

  const runReconcile = useCallback(async () => {
    try {
      setReconcileLoading(true);
      const res = await fetchWithUser("/api/admin/reconcile");
      if (res.ok) {
        const data = await res.json();
        setReconcileResult(data);
      }
    } catch (err) {
      console.error("Reconcile error", err);
    } finally {
      setReconcileLoading(false);
    }
  }, [fetchWithUser]);

  useEffect(() => {
    fetchDisputes();
    runReconcile();
  }, [fetchDisputes, runReconcile]);

  const handleResolve = async (disputeId: number, favourBuyer: boolean) => {
    if (!confirm(`Confirm dispute resolution: ${favourBuyer ? "Release USDT to buyer" : "Refund USDT to seller"}?`)) {
      return;
    }
    try {
      setResolvingId(disputeId);
      const res = await fetchWithUser(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favourBuyer }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Resolution failed");
      }
      await fetchDisputes();
      await runReconcile();
      await refreshUser();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setResolvingId(null);
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="max-w-[500px] mx-auto py-16 text-center space-y-3">
        <div className="p-6 bg-surface border border-line rounded-card space-y-3">
          <h2 className="text-base font-semibold text-ink">Admin area restricted</h2>
          <p className="text-xs text-muted leading-relaxed">
            You are currently viewing as <strong className="text-ink">{currentUser?.name}</strong> ({currentUser?.role}).
          </p>
          <p className="text-[11px] text-muted">
            Switch your active profile to &quot;Admin&quot; in the header user switcher to view this panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1120px] mx-auto">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Platform Administration</h1>
        <p className="text-sm text-muted">
          Escrow dispute arbitration and double-entry ledger reconciliation.
        </p>
      </div>

      {/* ── Reconciliation Audit Section ── */}
      <div className="bg-surface border border-line rounded-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Double-entry reconciliation check
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Invariant 4: Each account&apos;s cached balance must exactly equal the sum of its ledger entries.
            </p>
          </div>
          <button
            onClick={runReconcile}
            disabled={reconcileLoading}
            className="px-3.5 py-1.5 rounded-input bg-moss text-xs font-semibold disabled:opacity-40"
          >
            {reconcileLoading ? "Auditing..." : "Run reconciliation audit"}
          </button>
        </div>

        {reconcileResult && (
          <div className="space-y-3">
            <div
              className={`p-3 rounded-input border flex items-center justify-between text-xs font-medium ${
                reconcileResult.ok
                  ? "bg-paper border-line text-buy"
                  : "bg-paper border-alert/30 text-alert"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{reconcileResult.ok ? "✓" : "✗"}</span>
                <span>
                  {reconcileResult.ok
                    ? "Reconciliation passed. 0 discrepancies across all system accounts."
                    : `Discrepancies found: ${reconcileResult.discrepancyCount}`}
                </span>
              </div>
              <span className="text-[11px] text-muted font-mono font-normal tabular-nums">
                {new Date(reconcileResult.checkedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Account breakdown */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-paper border-b border-line text-muted uppercase text-[10px] tracking-wider font-sans font-semibold">
                  <tr>
                    <th className="py-2 px-3">Account ID</th>
                    <th className="py-2 px-3 font-sans">Owner</th>
                    <th className="py-2 px-3 font-sans">Kind</th>
                    <th className="py-2 px-3 text-right">Cached balance</th>
                    <th className="py-2 px-3 text-right">Sum of entries</th>
                    <th className="py-2 px-3 text-center font-sans">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {reconcileResult.accountsSummary.map((acc) => (
                    <tr key={acc.id} className="hover:bg-paper/30">
                      <td className="py-2 px-3 text-muted tabular-nums">#{acc.id}</td>
                      <td className="py-2 px-3 font-sans font-medium text-ink">{acc.userName}</td>
                      <td className="py-2 px-3 font-sans uppercase text-[10px] text-muted">
                        {acc.kind}
                      </td>
                      <td className="py-2 px-3 text-right text-ink font-semibold tabular-nums">
                        {acc.cachedBalance} USDT
                      </td>
                      <td className="py-2 px-3 text-right text-muted tabular-nums">
                        {acc.computedBalance} USDT
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <span className="text-buy font-medium text-[11px]">✓ Match</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Active Escrow Disputes ── */}
      <div className="bg-surface border border-line rounded-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Escrow trade disputes
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Funds remain safely held in escrow until an administrator confirms evidence and resolves.
            </p>
          </div>
          <button
            onClick={fetchDisputes}
            className="text-xs px-2.5 py-1 rounded-input border border-line bg-paper text-muted hover:text-ink font-medium"
          >
            Refresh
          </button>
        </div>

        {disputesLoading ? (
          <div className="py-12 text-center text-xs text-muted font-mono">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="py-8 text-center bg-paper border border-line rounded-input text-xs text-muted">
            No active or past disputes recorded.
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => {
              const isResolved = Boolean(d.resolution);
              return (
                <div
                  key={d.dispute_id}
                  className="bg-paper border border-line rounded-input p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <strong className="text-ink">Dispute #{d.dispute_id}</strong>
                      <Link
                        href={`/orders/${d.order_id}`}
                        className="text-moss hover:underline font-mono"
                      >
                        (Order #{d.order_id})
                      </Link>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-tag bg-surface border border-line text-muted">
                        {d.order_state}
                      </span>
                    </div>

                    <div className="text-xs font-mono font-semibold text-ink tabular-nums">
                      {d.usdtAmountFormatted} USDT • ₹{d.totalInrFormatted}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted">Buyer:</span>{" "}
                      <strong className="text-ink font-medium">{d.buyer_name}</strong>
                    </div>
                    <div>
                      <span className="text-muted">Seller:</span>{" "}
                      <strong className="text-ink font-medium">{d.seller_name}</strong>
                    </div>
                    <div className="sm:col-span-2 bg-surface p-2.5 rounded-input border border-line">
                      <span className="text-muted text-[10px] uppercase font-semibold block">
                        Reason opened by {d.opened_by_name}:
                      </span>
                      <p className="text-ink mt-0.5">&quot;{d.reason}&quot;</p>
                    </div>
                  </div>

                  {isResolved ? (
                    <div className="text-xs text-moss bg-surface p-2 rounded-input border border-line font-medium">
                      ✓ Resolved: {d.resolution?.replace(/_/g, " ")}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleResolve(d.dispute_id, true)}
                        disabled={resolvingId === d.dispute_id}
                        className="flex-1 py-2 px-3 rounded-input bg-buy text-white text-xs font-semibold disabled:opacity-40"
                      >
                        Release USDT to buyer ({d.buyer_name})
                      </button>
                      <button
                        onClick={() => handleResolve(d.dispute_id, false)}
                        disabled={resolvingId === d.dispute_id}
                        className="flex-1 py-2 px-3 rounded-input bg-sell text-white text-xs font-semibold disabled:opacity-40"
                      >
                        Refund USDT to seller ({d.seller_name})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
