"use client";

import React, { useState } from "react";
import { useUser } from "@/context/UserContext";

export default function WalletPage() {
  const { currentUser, balances, fetchWithUser, refreshUser } = useUser();

  // Faucet state
  const [faucetAmount, setFaucetAmount] = useState("100");
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState<string | null>(null);

  // Withdrawal state
  const [network, setNetwork] = useState<"TRC20" | "BEP20" | "ERC20">("TRC20");
  const [address, setAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<{
    txHash: string;
    amount: string;
    network: string;
    address: string;
  } | null>(null);

  // Preset fake addresses for easy testing
  const sampleAddresses = {
    TRC20: "TYDzsYUEpvnYmQk4zGP9sWWcTEd2MiAtW6",
    BEP20: "0x71C840A6B296dDE0ab9F9Ff5b4E19C5B28b030C8",
    ERC20: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  };

  const handleFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFaucetLoading(true);
      setFaucetSuccess(null);
      const res = await fetchWithUser("/api/dev/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: faucetAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Faucet failed");
      await refreshUser();
      setFaucetSuccess(`Successfully credited ${data.creditedUsdt} USDT to your wallet!`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setFaucetLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setWithdrawLoading(true);
      setWithdrawError(null);
      setWithdrawResult(null);

      const res = await fetchWithUser("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          address,
          amount: withdrawAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      await refreshUser();
      setWithdrawResult({
        txHash: data.txHash,
        amount: data.amountFormatted,
        network: data.network,
        address: data.address,
      });
      setWithdrawAmount("");
    } catch (err) {
      setWithdrawError((err as Error).message);
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">In-App USDT Wallet</h1>
        <p className="text-sm text-slate-400">
          Manage balances, request test funds from the faucet, and simulate crypto withdrawals.
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
          <span className="text-xs uppercase font-semibold text-slate-400">Available USDT</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-mono font-black text-emerald-400">
              {balances?.availableFormatted ?? "0.000000"}
            </span>
            <span className="text-sm font-bold text-slate-400">USDT</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Ready to trade or withdraw to an external simulated address.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
          <span className="text-xs uppercase font-semibold text-slate-400">Escrow Locked USDT</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-mono font-black text-amber-400">
              {balances?.lockedFormatted ?? "0.000000"}
            </span>
            <span className="text-sm font-bold text-slate-400">USDT</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Locked in active P2P trade orders. Released upon trade completion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Fake-Money Faucet */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>💧</span> Fake Money Faucet (Dev Only)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Mint demo USDT directly to <strong className="text-white">{currentUser?.name}</strong>&apos;s wallet. The double-entry counterparty is the system account.
            </p>
          </div>

          {faucetSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-lg text-xs text-emerald-300">
              {faucetSuccess}
            </div>
          )}

          <form onSubmit={handleFaucet} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Amount to Credit (USDT)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={faucetAmount}
                  onChange={(e) => setFaucetAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                  USDT
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {["50", "100", "500", "1000"].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFaucetAmount(val)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition"
                >
                  +{val}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={faucetLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow disabled:opacity-50"
            >
              {faucetLoading ? "Crediting..." : "Request USDT Faucet"}
            </button>
          </form>
        </div>

        {/* Simulated Withdrawal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📤</span> Simulated Crypto Withdrawal
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Debits user available balance and credits the system account. Requires valid address format.
            </p>
          </div>

          {withdrawError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-300">
              {withdrawError}
            </div>
          )}

          {withdrawResult && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs space-y-1.5">
              <p className="text-emerald-300 font-bold">
                ✓ Withdrawal of {withdrawResult.amount} USDT Simulated!
              </p>
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <p>Network: <strong className="text-white">{withdrawResult.network}</strong></p>
                <p className="truncate">Destination: <span className="font-mono text-slate-200">{withdrawResult.address}</span></p>
                <div className="pt-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Simulated Tx Hash:</span>
                  <span className="font-mono text-emerald-400 break-all select-all">{withdrawResult.txHash}</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Network
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["TRC20", "BEP20", "ERC20"] as const).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => {
                      setNetwork(net);
                      setAddress(sampleAddresses[net]);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      network === net
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase text-slate-400">
                  Recipient Address
                </label>
                <button
                  type="button"
                  onClick={() => setAddress(sampleAddresses[network])}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Use sample {network}
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
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold uppercase text-slate-400">
                  Withdrawal Amount (USDT)
                </label>
                <button
                  type="button"
                  onClick={() =>
                    balances && setWithdrawAmount(balances.availableFormatted)
                  }
                  className="text-[10px] text-emerald-400 hover:underline font-mono"
                >
                  Max ({balances?.availableFormatted ?? 0})
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                  USDT
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={withdrawLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 disabled:opacity-50"
            >
              {withdrawLoading ? "Simulating Withdrawal..." : "Simulate Withdrawal"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
