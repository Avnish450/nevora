"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function Header() {
  const { currentUser, balances, users, currentUserId, setCurrentUserId } = useUser();
  const pathname = usePathname();

  const navItems = [
    { label: "Marketplace", href: "/" },
    { label: "Create Ad", href: "/create-ad" },
    { label: "My Orders", href: "/orders" },
    { label: "Wallet", href: "/wallet" },
    { label: "Ledger", href: "/ledger" },
  ];

  if (currentUser?.role === "admin") {
    navItems.push({ label: "Admin Panel", href: "/admin" });
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-emerald-400">
                Nevora
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                P2P Escrow
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-slate-800 text-emerald-400 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Balances & User Switcher */}
          <div className="flex items-center gap-4">
            {/* USDT Balances */}
            <div className="hidden sm:flex items-center gap-3 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400 uppercase text-[10px] font-semibold">Available</span>
                <span className="font-mono font-bold text-emerald-400">
                  {balances?.availableFormatted ?? "0.000000"} USDT
                </span>
              </div>
              <div className="h-6 w-px bg-slate-700" />
              <div className="flex flex-col">
                <span className="text-slate-400 uppercase text-[10px] font-semibold">Locked</span>
                <span className="font-mono font-bold text-amber-400">
                  {balances?.lockedFormatted ?? "0.000000"} USDT
                </span>
              </div>
            </div>

            {/* Switch User dropdown */}
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg">
              <span className="text-slate-400 text-xs hidden lg:inline">User:</span>
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(parseInt(e.target.value, 10))}
                className="bg-transparent text-sm font-medium text-white focus:outline-none cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
