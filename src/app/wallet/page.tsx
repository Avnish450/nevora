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
    <div className="max-w-[1040px] mx-auto space-y-7">
      {/* ── Page Header ── */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink font-['Plus_Jakarta_Sans']">USDT Wallet</h1>
        <p className="text-sm text-muted">
          Your in-app balances, network-first deposits, and simulated crypto withdrawals.
        </p>
      </div>

      {/* ── MoonPay Style Balance Cards with Tabular Numbers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Available Balance */}
        <div className="bg-surface border border-line rounded-[28px] p-6 sm:p-7 space-y-3 shadow-sm hover:border-[#7D00FF]/30 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7D00FF]/10 blur-3xl pointer-events-none rounded-full" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-bold">
              Available balance
            </span>
            <span className="text-[11px] font-bold text-[#7D00FF] bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-800/50">
              Ready to trade
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-extrabold text-ink tabular-nums">
              {balances?.availableFormatted ?? "0.00"}
            </span>
            <span className="text-xs font-mono font-bold text-muted">USDT</span>
          </div>
          <p className="text-xs text-muted pt-2 border-t border-line">
            Available to place new sell ads, buy orders, or withdraw to an external wallet.
          </p>
        </div>

        {/* In Escrow Balance */}
        <div className="bg-surface border border-line rounded-[28px] p-6 sm:p-7 space-y-3 shadow-sm hover:border-amber/30 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber/10 blur-3xl pointer-events-none rounded-full" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-bold">
              In escrow
            </span>
            <span className="text-[11px] font-bold text-amber bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber/30">
              Active trades
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-extrabold text-amber tabular-nums">
              {balances?.lockedFormatted ?? "0.00"}
            </span>
            <span className="text-xs font-mono font-bold text-muted">USDT</span>
          </div>
          <p className="text-xs text-muted pt-2 border-t border-line">
            Locked in active P2P trades. Released immediately upon trade completion or cancelled.
          </p>
        </div>
      </div>

      {/* ── MoonPay Style Action Nav Pill Switcher ── */}
      <div className="inline-flex p-1 bg-surface-subtle border border-line rounded-full gap-1">
        <button
          onClick={() => {
            setActiveTab("overview");
            setWithdrawResult(null);
          }}
          className={`px-5 py-2 text-xs font-bold rounded-full transition-all ${
            activeTab === "overview"
              ? "bg-[#7D00FF] text-white shadow-md shadow-purple-500/25"
              : "text-muted hover:text-ink"
          }`}
        >
          Overview &amp; Activity
        </button>
        <button
          onClick={() => {
            setActiveTab("deposit");
            setWithdrawResult(null);
          }}
          className={`px-5 py-2 text-xs font-bold rounded-full transition-all ${
            activeTab === "deposit"
              ? "bg-[#7D00FF] text-white shadow-md shadow-purple-500/25"
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
          className={`px-5 py-2 text-xs font-bold rounded-full transition-all ${
            activeTab === "withdraw"
              ? "bg-[#7D00FF] text-white shadow-md shadow-purple-500/25"
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
        <div className="bg-surface border border-line rounded-[28px] p-6 sm:p-8 space-y-6 shadow-sm max-w-xl">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-ink font-['Plus_Jakarta_Sans']">Deposit USDT</h2>
            <p className="text-xs text-muted">
              Select your settlement blockchain network. In this environment, you can claim simulated USDT directly.
            </p>
          </div>

          {/* Network Selection Chips */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted block">1. Select Network</span>
            <div className="grid grid-cols-3 gap-2.5">
              {(["TRC20", "BEP20", "ERC20"] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setDepositNetwork(net)}
                  className={`py-2.5 px-3 rounded-full text-xs font-mono font-bold border text-center transition-all ${
                    depositNetwork === net
                      ? "bg-purple-50 dark:bg-purple-950/40 border-[#7D00FF] text-[#7D00FF] shadow-xs"
                      : "bg-surface border-line text-muted hover:text-ink"
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {/* Copyable Deposit Address */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-muted block">
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
          <div className="pt-5 border-t border-line space-y-3">
            <span className="text-xs font-bold text-ink block">
              Instant Testnet Faucet
            </span>
            <form onSubmit={handleFaucetDeposit} className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={faucetAmount}
                  onChange={(e) => setFaucetAmount(e.target.value)}
                  className="bg-surface-subtle border border-line rounded-full px-4 py-2.5 text-xs font-mono font-bold text-ink focus:outline-none focus:border-[#7D00FF] w-36 tabular-nums"
                />
                <span className="text-xs font-mono font-bold text-muted">USDT</span>
                <button
                  type="submit"
                  disabled={faucetLoading}
                  className="btn-moonpay px-5 py-2.5 text-xs font-bold disabled:opacity-40 ml-auto shadow-md shadow-purple-500/20"
                >
                  {faucetLoading ? "Crediting..." : "Claim USDT"}
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
            <div className="p-6 rounded-[28px] bg-surface border border-line space-y-3 animate-fade-up shadow-sm">
              <div className="flex items-center gap-2 text-[#00C278] font-bold text-sm">
                <span>✓</span>
                <span>Withdrawal Broadcasted Successfully</span>
              </div>
              <div className="p-4 bg-surface-subtle border border-line rounded-2xl space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted font-sans font-medium">Amount:</span>
                  <span className="font-bold text-ink tabular-nums">{withdrawResult.amount} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted font-sans font-medium">Network:</span>
                  <span className="text-ink font-semibold">{withdrawResult.network}</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-line">
                  <span className="text-muted font-sans block text-[11px]">Transaction Hash:</span>
                  <span className="break-all text-[11px] text-[#7D00FF] select-all font-semibold">{withdrawResult.txHash}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Form */}
          {withdrawStep === "form" && (
            <form onSubmit={handleWithdrawNext} className="bg-surface border border-line rounded-[28px] p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-ink font-['Plus_Jakarta_Sans']">Withdraw USDT</h2>
                <p className="text-xs text-muted">
                  Withdraw your available balance to an external blockchain address.
                </p>
              </div>

              {/* Network Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted block">1. Network</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["TRC20", "BEP20", "ERC20"] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => {
                        setNetwork(net);
                        setAddress(DEPOSIT_ADDRESSES[net]);
                      }}
                      className={`py-2.5 px-3 rounded-full text-xs font-mono font-bold border text-center transition-all ${
                        network === net
                          ? "bg-purple-50 dark:bg-purple-950/40 border-[#7D00FF] text-[#7D00FF] shadow-xs"
                          : "bg-surface border-line text-muted hover:text-ink"
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Address */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-muted">2. Destination Address</label>
                  <button
                    type="button"
                    onClick={() => setAddress(DEPOSIT_ADDRESSES[network])}
                    className="text-[#7D00FF] text-[11px] font-semibold hover:underline"
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
                  className="w-full bg-surface-subtle border border-line rounded-2xl p-3.5 text-xs font-mono text-ink focus:outline-none focus:border-[#7D00FF]"
                />
                {addressValidationMsg && (
                  <p className="text-[11px] text-amber font-medium">{addressValidationMsg}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <label className="font-bold text-muted">3. Amount</label>
                  <span className="text-muted text-[11px] font-mono">
                    Avail: {balances?.availableFormatted ?? "0.00"} USDT
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-surface-subtle border border-line rounded-2xl px-4 py-3 focus-within:border-[#7D00FF]">
                  <input
                    type="number"
                    step="any"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="flex-1 bg-transparent text-sm font-mono font-bold text-ink focus:outline-none tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(balances?.availableFormatted.replace(/,/g, "") || "0")}
                    className="text-xs font-bold text-[#7D00FF] px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 hover:bg-purple-100"
                  >
                    Max
                  </button>
                </div>
              </div>

              {withdrawError && (
                <div className="p-3 bg-red-500/10 border border-alert/30 rounded-2xl text-xs text-alert font-medium animate-shake">
                  {withdrawError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-full btn-moonpay font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all"
              >
                Review Withdrawal Summary &rarr;
              </button>
            </form>
          )}

          {/* Step 2: Confirmation Dialog */}
          {withdrawStep === "confirm" && (
            <div className="bg-surface border border-line rounded-[28px] p-6 sm:p-8 space-y-5 animate-fade-up shadow-sm">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-ink font-['Plus_Jakarta_Sans']">Review &amp; Confirm Withdrawal</h2>
                <p className="text-xs text-muted">
                  Double check the destination network and address. Blockchain transactions are irreversible.
                </p>
              </div>

              <div className="p-5 bg-surface-subtle border border-line rounded-2xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted font-medium">Network:</span>
                  <span className="font-mono font-bold text-ink">{network}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted font-medium">Withdrawal amount:</span>
                  <span className="font-mono font-bold text-ink tabular-nums">{withdrawAmount} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted font-medium">Network fee:</span>
                  <span className="font-mono text-[#00C278] font-bold">0.00 USDT (Zero fee)</span>
                </div>
                <div className="space-y-1 pt-2 border-t border-line">
                  <span className="text-muted block text-[11px] font-medium">Recipient Address:</span>
                  <span className="font-mono text-[11px] text-ink break-all select-all font-semibold">{address}</span>
                </div>
              </div>

              {withdrawError && (
                <div className="p-3 bg-red-500/10 border border-alert/30 rounded-2xl text-xs text-alert font-medium animate-shake">
                  {withdrawError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWithdrawStep("form")}
                  className="flex-1 py-3 px-4 rounded-full border border-line bg-surface text-xs font-bold text-muted hover:text-ink transition-colors"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWithdraw}
                  disabled={withdrawLoading}
                  className="flex-1 py-3 px-4 rounded-full btn-moonpay text-xs font-bold disabled:opacity-40 shadow-lg shadow-purple-500/25"
                >
                  {withdrawLoading ? "Broadcasting..." : "Authorize Withdrawal"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
