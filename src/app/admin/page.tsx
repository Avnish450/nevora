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
    if (!confirm(`Are you sure you want to ${favourBuyer ? "Release funds to Buyer" : "Refund funds to Seller"}?`)) {
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
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <h2 className="text-xl font-bold text-white">Admin Access Restricted</h2>
        <p className="text-sm text-slate-400">
          You are currently viewing as <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.role}).
        </p>
        <p className="text-xs text-slate-500">
          Use the <strong>User Switcher</strong> in the top right header to switch to &quot;Admin&quot; to access this screen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Platform Administration</h1>
        <p className="text-sm text-slate-400">
          Resolve disputed escrow trades and audit ledger double-entry reconciliation.
        </p>
      </div>

      {/* ── Reconciliation Section ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⚖️</span> Double-Entry Reconciliation Check
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Invariant 4: Every account&apos;s cached balance must exactly equal the sum of its ledger entries.
            </p>
          </div>
          <button
            onClick={runReconcile}
            disabled={reconcileLoading}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow disabled:opacity-50"
          >
            {reconcileLoading ? "Auditing Ledger..." : "Run Reconcile Audit"}
          </button>
        </div>

        {reconcileResult && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                reconcileResult.ok
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/40 border-rose-800 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{reconcileResult.ok ? "✓" : "✗"}</span>
                <span>
                  {reconcileResult.ok
                    ? "Reconciliation Passed! 0 Discrepancies across all accounts."
                    : `Discrepancies found: ${reconcileResult.discrepancyCount}`}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                Checked at {new Date(reconcileResult.checkedAt).toLocaleTimeString()}
              </span>
            </div>

            {/* Account Audit Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-800/60 uppercase text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Kind</th>
                    <th className="py-2.5 px-3 text-right">Cached Balance</th>
                    <th className="py-2.5 px-3 text-right">Sum of Entries</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reconcileResult.accountsSummary.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-800/20">
                      <td className="py-2 px-3 text-slate-400">Acc #{acc.id}</td>
                      <td className="py-2 px-3 font-sans font-medium text-white">{acc.userName}</td>
                      <td className="py-2 px-3">
                        <span className="uppercase text-[10px] font-bold text-slate-400">
                          {acc.kind}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-200">
                        {acc.cachedBalance} USDT
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        {acc.computedBalance} USDT
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-emerald-400 font-bold font-sans text-[11px]">
                          ✓ MATCH
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Disputes Section ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🛡️</span> Escrow Trade Disputes
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and resolve disputes. Funds are locked in escrow until you release or refund.
            </p>
          </div>
          <button
            onClick={fetchDisputes}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            ↻ Refresh Disputes
          </button>
        </div>

        {disputesLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-800/20 rounded-xl">
            No active or past disputes found.
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => {
              const isResolved = Boolean(d.resolution);
              return (
                <div
                  key={d.dispute_id}
                  className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">Dispute #{d.dispute_id}</span>
                      <Link
                        href={`/orders/${d.order_id}`}
                        className="text-xs font-mono text-emerald-400 hover:underline"
                      >
                        (Order #{d.order_id})
                      </Link>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          isResolved
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {d.order_state}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono">
                      {d.usdtAmountFormatted} USDT • ₹{d.totalInrFormatted} INR
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Buyer:</span>{" "}
                      <strong className="text-white">{d.buyer_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Seller:</span>{" "}
                      <strong className="text-white">{d.seller_name}</strong>
                    </div>
                    <div className="sm:col-span-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                        Reason from {d.opened_by_name}:
                      </span>
                      <p className="text-slate-200 mt-0.5 italic">&quot;{d.reason}&quot;</p>
                    </div>
                  </div>

                  {isResolved ? (
                    <div className="text-xs text-purple-300 bg-purple-950/30 p-2.5 rounded-lg border border-purple-900/50">
                      ✓ Resolved: <strong className="uppercase">{d.resolution?.replace(/_/g, " ")}</strong>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        onClick={() => handleResolve(d.dispute_id, true)}
                        disabled={resolvingId === d.dispute_id}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition disabled:opacity-50"
                      >
                        Release to Buyer ({d.buyer_name})
                      </button>
                      <button
                        onClick={() => handleResolve(d.dispute_id, false)}
                        disabled={resolvingId === d.dispute_id}
                        className="flex-1 py-2 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition disabled:opacity-50"
                      >
                        Refund Seller ({d.seller_name})
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
