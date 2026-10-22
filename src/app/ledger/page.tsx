"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/context/UserContext";

interface LedgerRow {
  id: number;
  journalId: number;
  journalType: string;
  referenceType?: string;
  referenceId?: number;
  accountKind: string;
  amount: string;
  amountFormatted: string;
  userName?: string;
  createdAt: string;
}

export default function LedgerPage() {
  const { currentUser, fetchWithUser } = useUser();
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [viewAll, setViewAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const url = viewAll ? "/api/ledger?all=true" : "/api/ledger";
      const res = await fetchWithUser(url);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setIsGlobal(data.isGlobal);
      }
    } catch (err) {
      console.error("Ledger fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [viewAll, fetchWithUser]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Immutable Ledger Audit</h1>
          <p className="text-sm text-slate-400">
            {isGlobal
              ? "Global double-entry audit trail across all accounts & journals"
              : `Audited ledger entries for ${currentUser?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setViewAll(!viewAll)}
              className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold transition ${
                viewAll
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              {viewAll ? "Viewing All (System-wide)" : "View System-Wide Ledger"}
            </button>
          )}
          <button
            onClick={fetchLedger}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 flex items-center justify-between">
        <div>
          <strong className="text-white">Ledger Invariant 3 &amp; 5:</strong> Every balance change is an immutable entry produced in the same DB transaction as the business event. Rows are never edited or deleted (enforced by DB trigger).
        </div>
        <div className="text-emerald-400 font-mono font-bold whitespace-nowrap ml-4">
          ✓ IMMUTABLE
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Loading ledger entries...</div>
      ) : entries.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
          No ledger entries recorded yet.
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Entry ID</th>
                  <th className="py-3 px-4">Journal ID</th>
                  <th className="py-3 px-4">Event Type</th>
                  {isGlobal && <th className="py-3 px-4">Account Owner</th>}
                  <th className="py-3 px-4">Account Kind</th>
                  <th className="py-3 px-4 text-right">Amount (USDT)</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {entries.map((row) => {
                  const isPositive = !row.amountFormatted.startsWith("-");
                  return (
                    <tr key={row.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-4 text-slate-400">#{row.id}</td>
                      <td className="py-3 px-4 text-slate-300">
                        J#{row.journalId}
                        {row.referenceType && (
                          <span className="text-[10px] text-slate-500 ml-1">
                            ({row.referenceType}:{row.referenceId})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-800 text-slate-200">
                          {row.journalType}
                        </span>
                      </td>
                      {isGlobal && (
                        <td className="py-3 px-4 font-sans text-slate-200">
                          {row.userName}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            row.accountKind === "available"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : row.accountKind === "locked"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {row.accountKind}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold text-sm ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? `+${row.amountFormatted}` : row.amountFormatted}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-sans text-xs">
                        {new Date(row.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
