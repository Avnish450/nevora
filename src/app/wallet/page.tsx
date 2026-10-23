"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import CopyField from "@/components/CopyField";

interface LedgerActivity {
  id: number;
  journalId: number;
  journalType: string;
  accountKind: string;
  amount: string;
  amountFormatted: string;
  createdAt: string;
}

const DEPOSIT_ADDRESSES = {
  TRC20: "TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6",
  BEP20: "0x71C840A6B296dDE0ab9F9Ff5b4E19C5B28b030C8",
  ERC20: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
};

export default function WalletPage() {
  const { currentUser, balances, fetchWithUser, refreshUser } = useUser();
  const { showToast } = useToast();

  // Mode: "overview" | "deposit" | "withdraw"
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "withdraw">("overview");

  // Faucet state (Deposit simulation)
  const [faucetAmount, setFaucetAmount] = useState("100");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [depositNetwork, setDepositNetwork] = useState<"TRC20" | "BEP20" | "ERC20">("TRC20");

  // Withdrawal state
  const [network, setNetwork] = useState<"TRC20" | "BEP20" | "ERC20">("TRC20");
  const [address, setAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addressValidationMsg, setAddressValidationMsg] = useState<string | null>(null);
  const [withdrawStep, setWithdrawStep] = useState<"form" | "confirm">("form");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<{
    txHash: string;
    amount: string;
    network: string;
    address: string;
  } | null>(null);

  // Activity list
  const [activities, setActivities] = useState<LedgerActivity[]>([]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetchWithUser("/api/ledger");
      if (res.ok) {
        const data = await res.json();
        setActivities((data.entries || []).slice(0, 8));
      }
    } catch (err) {
      console.error("Activity load error", err);
    }
  }, [fetchWithUser]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Real-time address format validation
  useEffect(() => {
    if (!address.trim()) {
      setAddressValidationMsg(null);
      return;
    }
    const trimmed = address.trim();
    if (network === "TRC20") {
      if (!trimmed.startsWith("T")) {
        setAddressValidationMsg("TRC20 addresses must start with capital letter 'T'.");
      } else if (trimmed.length !== 34) {
        setAddressValidationMsg(`TRC20 addresses are 34 characters long (currently ${trimmed.length}).`);
      } else {
        setAddressValidationMsg(null);
      }
    } else {
      if (!trimmed.startsWith("0x")) {
        setAddressValidationMsg(`${network} addresses must start with '0x'.`);
      } else if (trimmed.length !== 42) {
        setAddressValidationMsg(`${network} addresses are 42 characters long (currently ${trimmed.length}).`);
      } else {
        setAddressValidationMsg(null);
      }
    }
  }, [address, network]);

  const handleFaucetDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFaucetLoading(true);
      const res = await fetchWithUser("/api/dev/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: faucetAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deposit failed");
      await refreshUser();
      await fetchActivity();
      showToast(`Credited ${data.creditedUsdt} USDT to your wallet via demo faucet.`, "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleWithdrawNext = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);

    if (addressValidationMsg) {
      setWithdrawError(addressValidationMsg);
      return;
    }

    const amt = parseFloat(withdrawAmount);
    const avail = parseFloat(balances?.availableFormatted.replace(/,/g, "") || "0");
    if (isNaN(amt) || amt <= 0) {
      setWithdrawError("Please enter a valid amount greater than zero.");
      return;
    }
    if (amt > avail) {
      setWithdrawError(`You need ${(amt - avail).toFixed(2)} more USDT available to withdraw this amount.`);
      return;
    }

    setWithdrawStep("confirm");
  };

  const handleConfirmWithdraw = async () => {
    try {
      setWithdrawLoading(true);
      setWithdrawError(null);

      const res = await fetchWithUser("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          address: address.trim(),
          amount: withdrawAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");

      await refreshUser();
      await fetchActivity();
      setWithdrawResult({
        txHash: data.txHash,
        amount: data.amountFormatted,
        network: data.network,
        address: data.address,
      });
      setWithdrawStep("form");
      setWithdrawAmount("");
      setAddress("");
      showToast(`Successfully processed withdrawal of ${data.amountFormatted} USDT.`, "success");
    } catch (err) {
      setWithdrawError((err as Error).message);
      setWithdrawStep("form");
      showToast((err as Error).message, "error");
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="max-w-[1020px] mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">USDT Wallet</h1>
        <p className="text-sm text-muted">
          Your in-app balances, network-first deposits, and simulated crypto withdrawals.
        </p>
      </div>

      {/* ── Balance Cards with One-Line Explanations & Tabular Numbers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Available Balance */}
        <div className="bg-surface border border-line rounded-card p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              Available balance
            </span>
            <span className="text-[11px] font-medium text-moss bg-paper px-2 py-0.5 rounded-tag border border-line">
              Ready to trade
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-ink tabular-nums">
              {balances?.availableFormatted ?? "0.00"}
            </span>
            <span className="text-xs font-mono font-medium text-muted">USDT</span>
          </div>
          <p className="text-xs text-muted pt-1 border-t border-line">
            Available to place new sell ads, buy orders, or withdraw to an external wallet.
          </p>
        </div>

        {/* In Escrow Balance */}
        <div className="bg-surface border border-line rounded-card p-5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              In escrow
            </span>
            <span className="text-[11px] font-medium text-amber bg-paper px-2 py-0.5 rounded-tag border border-line">
              Active trades
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-amber tabular-nums">
              {balances?.lockedFormatted ?? "0.00"}
            </span>
            <span className="text-xs font-mono font-medium text-muted">USDT</span>
          </div>
          <p className="text-xs text-muted pt-1 border-t border-line">
            Locked in active P2P trades. Released immediately upon trade completion or cancelled.
          </p>
        </div>
      </div>

      {/* ── Action Nav Tabs ── */}
      <div className="flex border-b border-line gap-6 text-sm">
        <button
          onClick={() => {
            setActiveTab("overview");
            setWithdrawResult(null);
          }}
          className={`pb-2.5 font-medium transition-colors ${
            activeTab === "overview"
              ? "text-moss font-semibold border-b-2 border-moss -mb-px"
              : "text-muted hover:text-ink"
          }`}
        >
          Overview &amp; recent activity
        </button>
        <button
          onClick={() => {
            setActiveTab("deposit");
            setWithdrawResult(null);
          }}
          className={`pb-2.5 font-medium transition-colors ${
            activeTab === "deposit"
              ? "text-moss font-semibold border-b-2 border-moss -mb-px"
              : "text-muted hover:text-ink"
          }`}
        >
          Deposit (Network-First)
        </button>
        <button
          onClick={() => {
            setActiveTab("withdraw");
            setWithdrawResult(null);
          }}
          className={`pb-2.5 font-medium transition-colors ${
            activeTab === "withdraw"
              ? "text-moss font-semibold border-b-2 border-moss -mb-px"
              : "text-muted hover:text-ink"
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW & RECENT ACTIVITY ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-surface border border-line rounded-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Recent Wallet Activity</h2>
                <p className="text-xs text-muted mt-0.5">
                  Synchronized with the platform&apos;s zero-sum double-entry ledger.
                </p>
              </div>
              <Link
                href="/ledger"
                className="text-xs font-medium text-moss hover:underline"
              >
                View full ledger audit &rarr;
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No recent activity recorded.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {activities.map((act) => {
                  const isCredit = !act.amountFormatted.startsWith("-");
                  return (
                    <div
                      key={act.id}
                      className="py-3 flex items-center justify-between text-xs hover:bg-paper/30 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink uppercase text-[11px]">
                            {act.journalType}
                          </span>
                          <span className="text-[10px] text-muted font-mono">
                            Journal #{act.journalId}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted font-mono tabular-nums">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            isCredit ? "text-buy" : "text-ink"
                          }`}
                        >
                          {act.amountFormatted} USDT
                        </span>
                        <span className="block text-[10px] text-muted uppercase">
                          {act.accountKind}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: NETWORK-FIRST DEPOSIT (FAUCET) ── */}
      {activeTab === "deposit" && (
        <div className="bg-surface border border-line rounded-card p-6 space-y-6 shadow-xs max-w-xl">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">Deposit USDT</h2>
            <p className="text-xs text-muted">
              Select your blockchain network. In this demo environment, you can claim simulated USDT directly to your available balance.
            </p>
          </div>

          {/* Network Selection Chips */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted block">1. Select Network</span>
            <div className="grid grid-cols-3 gap-2">
              {(["TRC20", "BEP20", "ERC20"] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setDepositNetwork(net)}
                  className={`py-2 px-3 rounded-input text-xs font-mono font-medium border text-center transition-colors btn-press ${
                    depositNetwork === net
                      ? "bg-paper border-moss text-moss font-semibold shadow-xs"
                      : "bg-surface border-line text-muted hover:text-ink"
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {/* Copyable Deposit Address */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted block">
              2. Deposit Address ({depositNetwork})
            </span>
            <CopyField
              value={DEPOSIT_ADDRESSES[depositNetwork]}
              label={`Your ${depositNetwork} Deposit Address`}
            />
            <p className="text-[11px] text-muted">
              Send only USDT ({depositNetwork}) to this address. Credits after 1 network confirmation.
            </p>
          </div>

          {/* Demo Simulated Instant Faucet */}
          <div className="pt-4 border-t border-line space-y-3">
            <span className="text-xs font-semibold text-ink block">
              Demo Environment: Instant Faucet
            </span>
            <form onSubmit={handleFaucetDeposit} className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={faucetAmount}
                  onChange={(e) => setFaucetAmount(e.target.value)}
                  className="bg-paper border border-line rounded-input px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-moss w-32 tabular-nums"
                />
                <span className="text-xs font-mono text-muted">USDT</span>
                <button
                  type="submit"
                  disabled={faucetLoading}
                  className="px-4 py-2 rounded-input bg-moss text-white text-xs font-semibold hover:opacity-95 disabled:opacity-40 btn-press ml-auto shadow-xs"
                >
                  {faucetLoading ? "Crediting..." : "Claim from faucet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 3: STEP-BY-STEP WITHDRAWAL ── */}
      {activeTab === "withdraw" && (
        <div className="space-y-6 max-w-xl">
          {/* Withdrawal Result Confirmation Card */}
          {withdrawResult && (
            <div className="p-5 rounded-card bg-surface border border-line space-y-3 animate-fade-up shadow-xs">
              <div className="flex items-center gap-2 text-buy font-semibold text-sm">
                <span>✓</span>
                <span>Withdrawal Broadcasted Successfully</span>
              </div>
              <div className="p-3 bg-paper border border-line rounded-input space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted font-sans">Amount:</span>
                  <span className="font-bold text-ink tabular-nums">{withdrawResult.amount} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted font-sans">Network:</span>
                  <span className="text-ink">{withdrawResult.network}</span>
                </div>
                <div className="space-y-1 pt-1 border-t border-line">
                  <span className="text-muted font-sans block text-[11px]">Transaction Hash:</span>
                  <span className="break-all text-[11px] text-moss select-all">{withdrawResult.txHash}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Form */}
          {withdrawStep === "form" && (
            <form onSubmit={handleWithdrawNext} className="bg-surface border border-line rounded-card p-6 space-y-5 shadow-xs">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-ink">Withdraw USDT</h2>
                <p className="text-xs text-muted">
                  Withdraw your available balance to an external blockchain address.
                </p>
              </div>

              {/* Network Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted block">1. Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["TRC20", "BEP20", "ERC20"] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => {
                        setNetwork(net);
                        setAddress(DEPOSIT_ADDRESSES[net]);
                      }}
                      className={`py-2 px-3 rounded-input text-xs font-mono font-medium border text-center transition-colors btn-press ${
                        network === net
                          ? "bg-paper border-moss text-moss font-semibold shadow-xs"
                          : "bg-surface border-line text-muted hover:text-ink"
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Address */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-muted">2. Destination Address</label>
                  <button
                    type="button"
                    onClick={() => setAddress(DEPOSIT_ADDRESSES[network])}
                    className="text-moss text-[11px] hover:underline"
                  >
                    Use sample address
                  </button>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={`Enter ${network} address...`}
                  required
                  className="w-full bg-paper border border-line rounded-input p-2.5 text-xs font-mono text-ink focus:outline-none focus:border-moss"
                />
                {addressValidationMsg && (
                  <p className="text-[11px] text-amber">{addressValidationMsg}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="font-medium text-muted">3. Amount</label>
                  <span className="text-muted text-[11px] font-mono">
                    Avail: {balances?.availableFormatted ?? "0.00"} USDT
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-paper border border-line rounded-input px-3 py-2 focus-within:border-moss">
                  <input
                    type="number"
                    step="any"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="flex-1 bg-transparent text-xs font-mono text-ink focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(balances?.availableFormatted.replace(/,/g, "") || "0")}
                    className="text-xs font-semibold text-moss px-2 py-0.5 rounded-tag bg-surface border border-line hover:bg-paper"
                  >
                    Max
                  </button>
                </div>
              </div>

              {withdrawError && (
                <div className="p-2.5 bg-paper border border-alert/30 rounded-input text-xs text-alert animate-shake">
                  {withdrawError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-input bg-moss text-white font-semibold text-xs hover:opacity-95 btn-press shadow-xs"
              >
                Review Withdrawal Summary &rarr;
              </button>
            </form>
          )}

          {/* Step 2: Confirmation Dialog */}
          {withdrawStep === "confirm" && (
            <div className="bg-surface border border-line rounded-card p-6 space-y-5 animate-fade-up shadow-xs">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-ink">Review &amp; Confirm Withdrawal</h2>
                <p className="text-xs text-muted">
                  Double check the destination network and address. Blockchain transactions are irreversible.
                </p>
              </div>

              <div className="p-4 bg-paper border border-line rounded-input space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Network:</span>
                  <span className="font-mono font-semibold text-ink">{network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Withdrawal amount:</span>
                  <span className="font-mono font-bold text-ink tabular-nums">{withdrawAmount} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Network fee:</span>
                  <span className="font-mono text-buy font-semibold">0.00 USDT (Zero fee)</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-line">
                  <span className="text-muted block text-[11px]">Recipient Address:</span>
                  <span className="font-mono text-[11px] text-ink break-all select-all">{address}</span>
                </div>
              </div>

              {withdrawError && (
                <div className="p-2.5 bg-paper border border-alert/30 rounded-input text-xs text-alert animate-shake">
                  {withdrawError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setWithdrawStep("form")}
                  className="flex-1 py-2.5 px-3 rounded-input border border-line text-xs font-medium text-muted hover:text-ink btn-press"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={withdrawLoading}
                  onClick={handleConfirmWithdraw}
                  className="flex-1 py-2.5 px-3 rounded-input bg-moss text-white text-xs font-semibold disabled:opacity-40 btn-press shadow-xs"
                >
                  {withdrawLoading ? "Broadcasting..." : "Confirm & Send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
