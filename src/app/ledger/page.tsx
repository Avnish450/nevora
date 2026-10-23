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
    <div className="space-y-6 max-w-[1120px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ledger Audit</h1>
          <p className="text-sm text-muted">
            {isGlobal
              ? "System-wide double-entry journal records."
              : `Immutable entries recorded for ${currentUser?.name}.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setViewAll(!viewAll)}
              className={`text-xs px-3 py-1.5 rounded-input border font-medium ${
                viewAll
                  ? "bg-paper text-ink font-semibold border-moss"
                  : "bg-surface text-muted border-line hover:text-ink"
              }`}
            >
              {viewAll ? "Viewing all accounts" : "Show all accounts"}
            </button>
          )}
          <button
            onClick={fetchLedger}
            className="text-xs px-3 py-1.5 rounded-input border border-line bg-surface text-muted hover:text-ink font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-3.5 bg-surface border border-line rounded-card text-xs text-muted flex items-start justify-between">
        <p className="max-w-[720px] leading-relaxed">
          <strong className="text-ink">Double-entry principle:</strong> Every balance change is an immutable row tied to a zero-sum journal. Entries cannot be edited or deleted (enforced by PostgreSQL trigger). Corrections are made via reversing entries.
        </p>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-tag bg-paper border border-line text-moss font-semibold whitespace-nowrap ml-4">
          Immutable
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-muted font-mono">
          Loading ledger entries...
        </div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center bg-surface border border-line rounded-card text-xs text-muted">
          No ledger entries recorded yet.
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-paper border-b border-line text-muted uppercase text-[10px] tracking-wider font-semibold font-sans">
                <tr>
                  <th className="py-2.5 px-4">Entry ID</th>
                  <th className="py-2.5 px-4">Journal</th>
                  <th className="py-2.5 px-4">Type</th>
                  {isGlobal && <th className="py-2.5 px-4 font-sans">Owner</th>}
                  <th className="py-2.5 px-4">Bucket</th>
                  <th className="py-2.5 px-4 text-right">Amount (USDT)</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                {entries.map((row) => {
                  const isPositive = !row.amountFormatted.startsWith("-");
                  return (
                    <tr key={row.id} className="hover:bg-paper/40">
                      <td className="py-3 px-4 text-muted tabular-nums">#{row.id}</td>
                      <td className="py-3 px-4 text-ink tabular-nums">
                        J#{row.journalId}
                        {row.referenceType && (
                          <span className="text-[10px] text-muted ml-1 font-sans">
                            ({row.referenceType}:{row.referenceId})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-ink capitalize">
                        {row.journalType}
                      </td>
                      {isGlobal && (
                        <td className="py-3 px-4 font-sans text-ink">
                          {row.userName}
                        </td>
                      )}
                      <td className="py-3 px-4 font-sans uppercase text-[10px] text-muted">
                        {row.accountKind}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold tabular-nums ${
                          isPositive ? "text-buy" : "text-alert"
                        }`}
                      >
                        {isPositive ? `+${row.amountFormatted}` : row.amountFormatted}
                      </td>
                      <td className="py-3 px-4 text-right text-muted font-sans text-[11px] tabular-nums">
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
