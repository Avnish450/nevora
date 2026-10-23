"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import Link from "next/link";

interface LedgerActivity {
  id: number;
  journalId: number;
  journalType: string;
  accountKind: string;
  amount: string;
  amountFormatted: string;
  createdAt: string;
}

export default function WalletPage() {
  const { currentUser, balances, fetchWithUser, refreshUser } = useUser();

  // Mode: "overview" | "deposit" | "withdraw"
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "withdraw">("overview");

  // Faucet state (Deposit simulation)
  const [faucetAmount, setFaucetAmount] = useState("100");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);

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

  const sampleAddresses = {
    TRC20: "TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6",
    BEP20: "0x71C840A6B296dDE0ab9F9Ff5b4E19C5B28b030C8",
    ERC20: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  };

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
      setFaucetMessage(null);
      const res = await fetchWithUser("/api/dev/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: faucetAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deposit failed");
      await refreshUser();
      await fetchActivity();
      setFaucetMessage(`Credited ${data.creditedUsdt} USDT to your wallet via demo faucet.`);
    } catch (err) {
      alert((err as Error).message);
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
    } catch (err) {
      setWithdrawError((err as Error).message);
      setWithdrawStep("form");
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
          Your in-app balances, simulated deposits, and crypto withdrawals.
        </p>
      </div>

      {/* ── Balance Cards with One-Line Explanations ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Available Balance */}
        <div className="bg-surface border border-line rounded-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              Available balance
            </span>
            <span className="text-[11px] font-medium text-moss">Ready to trade</span>
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
        <div className="bg-surface border border-line rounded-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted font-semibold">
              In escrow
            </span>
            <span className="text-[11px] font-medium text-amber">Active trades</span>
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
          Deposit (Faucet)
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

      {/* ── Tab 1: Overview & Activity ── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wider text-muted font-semibold">
              Recent activity
            </h2>
            <Link href="/ledger" className="text-xs text-moss hover:underline">
              View full ledger →
            </Link>
          </div>

          {activities.length === 0 ? (
            <div className="p-8 text-center bg-surface border border-line rounded-card text-xs text-muted">
              No recent wallet transactions.
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-card overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-line text-muted uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Event</th>
                    <th className="py-2.5 px-4">Bucket</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono text-xs">
                  {activities.map((a) => {
                    const isCredit = !a.amountFormatted.startsWith("-");
                    return (
                      <tr key={a.id} className="hover:bg-paper/40">
                        <td className="py-3 px-4 font-sans font-medium text-ink capitalize">
                          {a.journalType}
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] text-muted font-sans">
                          {a.accountKind}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold tabular-nums ${
                            isCredit ? "text-buy" : "text-alert"
                          }`}
                        >
                          {isCredit ? `+${a.amountFormatted}` : a.amountFormatted} USDT
                        </td>
                        <td className="py-3 px-4 text-right text-muted font-sans text-[11px]">
                          {new Date(a.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Deposit (Simulated Faucet) ── */}
      {activeTab === "deposit" && (
        <div className="max-w-[540px] bg-surface border border-line rounded-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Demo USDT deposit</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Mint demo USDT into your wallet to test trading. The platform records this against the system reserve account.
            </p>
          </div>

          {/* Persistent Network Warning */}
          <div className="p-3 bg-paper border border-line rounded-input text-xs text-muted">
            <strong className="text-ink">Persistent note:</strong> This is a fake-money testing faucet. No real cryptocurrency or tokens are moved.
          </div>

          {faucetMessage && (
            <div className="p-3 bg-paper border border-line rounded-input text-xs text-moss font-medium">
              ✓ {faucetMessage}
            </div>
          )}

          <form onSubmit={handleFaucetDeposit} className="space-y-4 text-xs">
            <div>
              <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
                Amount to credit (USDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={faucetAmount}
                  onChange={(e) => setFaucetAmount(e.target.value)}
                  className="w-full bg-paper border border-line rounded-input py-2 px-3 text-ink font-mono focus:outline-none focus:border-moss"
                />
                <span className="absolute right-3 top-2 text-muted font-mono font-medium">
                  USDT
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {["50", "100", "500", "1000"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFaucetAmount(v)}
                  className="px-2.5 py-1 rounded-input border border-line bg-paper text-muted hover:text-ink font-mono text-[11px]"
                >
                  +{v}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={faucetLoading}
              className="w-full py-2.5 px-4 rounded-input bg-moss text-xs font-semibold disabled:opacity-40"
            >
              {faucetLoading ? "Crediting..." : "Credit demo USDT"}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab 3: Withdraw ── */}
      {activeTab === "withdraw" && (
        <div className="max-w-[540px] bg-surface border border-line rounded-card p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Simulated withdrawal</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Order of operations: select network, enter destination address, then enter amount.
            </p>
          </div>

          {withdrawResult && (
            <div className="p-4 bg-paper border border-line rounded-input text-xs space-y-2">
              <span className="text-moss font-semibold block">
                ✓ Withdrawal simulated successfully
              </span>
              <p className="text-muted">
                Sent <strong className="text-ink">{withdrawResult.amount} USDT</strong> over {withdrawResult.network} to:
              </p>
              <p className="font-mono text-ink text-[11px] select-all break-all bg-surface p-2 rounded-input border border-line">
                {withdrawResult.address}
              </p>
              <div className="pt-1">
                <span className="text-[10px] text-muted uppercase font-semibold block">Simulated Tx Hash:</span>
                <span className="font-mono text-[11px] text-muted break-all">{withdrawResult.txHash}</span>
              </div>
            </div>
          )}

          {withdrawError && (
            <div className="p-3 bg-paper border border-alert/30 rounded-input text-xs text-alert">
              {withdrawError}
            </div>
          )}

          {withdrawStep === "form" ? (
            <form onSubmit={handleWithdrawNext} className="space-y-4 text-xs">
              {/* 1. Network Selector */}
              <div>
                <label className="block uppercase tracking-wider text-muted font-semibold mb-1">
                  1. Network
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["TRC20", "BEP20", "ERC20"] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => {
                        setNetwork(net);
                        setAddress("");
                      }}
                      className={`py-2 text-xs font-medium rounded-input border transition-colors ${
                        network === net
                          ? "bg-paper text-ink font-semibold border-moss"
                          : "bg-surface text-muted border-line hover:text-ink"
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Destination Address with Live Format Validation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="uppercase tracking-wider text-muted font-semibold">
                    2. Destination address
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddress(sampleAddresses[network])}
                    className="text-[11px] text-moss hover:underline"
                  >
                    Paste sample {network}
                  </button>
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={
                    network === "TRC20"
                      ? "T... (34 characters)"
                      : "0x... (42 characters)"
                  }
                  required
                  className={`w-full bg-paper border rounded-input py-2 px-3 font-mono text-ink text-xs focus:outline-none ${
                    addressValidationMsg ? "border-alert" : "border-line focus:border-moss"
                  }`}
                />
                {addressValidationMsg && (
                  <p className="text-[11px] text-alert mt-1">{addressValidationMsg}</p>
                )}
              </div>

              {/* 3. Amount */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="uppercase tracking-wider text-muted font-semibold">
                    3. Withdrawal amount
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      balances && setWithdrawAmount(balances.availableFormatted.replace(/,/g, ""))
                    }
                    className="text-[11px] text-moss hover:underline font-mono tabular-nums"
                  >
                    Max ({balances?.availableFormatted ?? 0} USDT)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full bg-paper border border-line rounded-input py-2 px-3 font-mono text-ink text-xs focus:outline-none focus:border-moss"
                  />
                  <span className="absolute right-3 top-2 text-muted font-mono font-medium">
                    USDT
                  </span>
                </div>
              </div>

              {/* Network Fee line */}
              <div className="flex items-center justify-between text-muted text-xs pt-1 border-t border-line">
                <span>Network fee:</span>
                <span className="font-mono text-ink font-medium">0.00 USDT (Demo waived)</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-input bg-moss text-xs font-semibold"
              >
                Review withdrawal details →
              </button>
            </form>
          ) : (
            /* Withdrawal Summary / Confirm Screen */
            <div className="space-y-4 text-xs">
              <div className="bg-paper border border-line rounded-input p-4 space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider text-muted font-semibold block">
                  Confirm withdrawal details
                </span>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-muted">Network:</span>
                  <strong className="text-ink font-semibold">{network}</strong>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-muted">Destination:</span>
                  <span className="font-mono text-ink text-[11px] select-all max-w-[280px] truncate">
                    {address}
                  </span>
                </div>
                <div className="flex justify-between border-b border-line pb-2">
                  <span className="text-muted">Amount:</span>
                  <span className="font-mono font-semibold text-ink tabular-nums">
                    {parseFloat(withdrawAmount).toFixed(2)} USDT
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-muted">You will receive:</span>
                  <span className="font-mono font-bold text-ink tabular-nums">
                    {parseFloat(withdrawAmount).toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted leading-relaxed">
                Irreversible simulated action: your in-app available USDT will be debited and transferred to the system account.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setWithdrawStep("form")}
                  className="flex-1 py-2 px-3 rounded-input border border-line text-muted hover:text-ink text-xs font-medium"
                >
                  Edit details
                </button>
                <button
                  type="button"
                  onClick={handleConfirmWithdraw}
                  disabled={withdrawLoading}
                  className="flex-1 py-2 px-3 rounded-input bg-moss text-xs font-semibold disabled:opacity-40"
                >
                  {withdrawLoading ? "Processing..." : "Confirm withdrawal"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
