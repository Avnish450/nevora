"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function Header() {
  const { currentUser, balances, users, currentUserId, setCurrentUserId } = useUser();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check initial dark mode
    const isDarkStored = localStorage.getItem("nevora_theme") === "dark" ||
      (!("nevora_theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkStored);
    if (isDarkStored) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("nevora_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("nevora_theme", "light");
    }
  };

  const navItems = [
    { label: "Marketplace", href: "/marketplace" },
    { label: "Post Ad", href: "/create-ad" },
    { label: "My Orders", href: "/orders" },
    { label: "Wallet", href: "/wallet" },
    { label: "Ledger", href: "/ledger" },
  ];

  if (currentUser?.role === "admin") {
    navItems.push({ label: "Admin", href: "/admin" });
  }

  return (
    <header className="bg-surface border-b border-line sticky top-0 z-40 transition-colors">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Wordmark & Nav */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-bold tracking-tight text-ink">
                nevora
              </span>
              <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-tag bg-surface border border-line text-muted">
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
                    className={`px-3 py-1.5 rounded-input text-sm font-medium transition-colors ${
                      isActive
                        ? "text-moss bg-paper font-semibold"
                        : "text-muted hover:text-ink hover:bg-paper/50"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Balances, User Switcher & Theme */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live USDT Balances */}
            <div className="hidden sm:flex items-center gap-3 bg-paper border border-line px-3 py-1 rounded-input text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted text-[11px]">Available</span>
                <span className="font-mono font-semibold text-ink tabular-nums">
                  {balances?.availableFormatted ?? "0.00"}
                </span>
                <span className="text-[10px] text-muted font-sans">USDT</span>
              </div>
              <span className="text-line">|</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted text-[11px]">In escrow</span>
                <span className="font-mono font-semibold text-amber tabular-nums">
                  {balances?.lockedFormatted ?? "0.00"}
                </span>
                <span className="text-[10px] text-muted font-sans">USDT</span>
              </div>
            </div>

            {/* Switch user selector */}
            <div className="flex items-center bg-surface border border-line rounded-input px-2 py-1 text-xs">
              <span className="text-muted mr-1.5 hidden lg:inline">Act as:</span>
              <select
                value={currentUserId}
                onChange={(e) => setCurrentUserId(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-medium text-ink focus:outline-none cursor-pointer pr-1"
                aria-label="Switch User"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-surface text-ink">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Subtle Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-xs text-muted hover:text-ink rounded-input border border-line bg-surface"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {isDark ? "☼" : "☾"}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden border-t border-line px-4 py-2 flex items-center justify-between overflow-x-auto text-xs bg-paper">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-2.5 py-1 whitespace-nowrap rounded-input ${
              pathname === item.href
                ? "text-moss font-semibold bg-surface border border-line"
                : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
