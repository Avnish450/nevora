"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function Header() {
  const { currentUser, balances, users, currentUserId, setCurrentUserId } = useUser();
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Explicitly default to friendly white & purple theme (light mode)
    const storedTheme = localStorage.getItem("nevora_theme");
    const isDarkStored = storedTheme === "dark";
    setIsDark(isDarkStored);
    if (isDarkStored) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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

  if (mounted && currentUser?.role === "admin") {
    navItems.push({ label: "Admin", href: "/admin" });
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ${
        isScrolled
          ? "bg-surface/90 border-b border-line shadow-sm backdrop-blur-md"
          : "bg-surface/70 border-b border-transparent backdrop-blur-xs"
      }`}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Wordmark & Nav */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* MoonPay-inspired Electric Violet Logo Mark */}
              <div className="w-8 h-8 rounded-full bg-[#7D00FF] flex items-center justify-center text-white shadow-md shadow-purple-500/25 group-hover:scale-105 transition-transform">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-3.31 2.01-6.16 4.9-7.36C8.35 6.07 8 7.97 8 10c0 4.41 3.59 8 8 8 2.03 0 3.93-.35 5.36-.9-1.2 2.89-4.05 4.9-7.36 4.9z"/>
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-ink font-['Plus_Jakarta_Sans']">
                  nevora<span className="text-[#7D00FF]">.</span>
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-[#7D00FF] border border-purple-200/60 dark:border-purple-800/40">
                  Escrow
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? "text-[#7D00FF] bg-purple-50 dark:bg-purple-950/40 font-bold"
                        : "text-muted hover:text-ink hover:bg-surface-subtle"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Balances, User Switcher, Trade CTA & Theme */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live USDT Balances */}
            <div className="hidden sm:flex items-center gap-2.5 bg-surface-subtle border border-line px-3.5 py-1.5 rounded-full text-xs">
              <div className="flex items-baseline gap-1.5">
                <span className="text-muted text-[11px] font-medium">Bal</span>
                <span suppressHydrationWarning className="font-mono font-bold text-ink tabular-nums">
                  {mounted && balances ? balances.availableFormatted : "0.00"}
                </span>
                <span className="text-[10px] text-muted">USDT</span>
              </div>
              {mounted && balances && parseFloat(balances.locked) > 0 && (
                <>
                  <span className="text-line">|</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                    <span className="text-muted text-[11px]">Locked</span>
                    <span suppressHydrationWarning className="font-mono font-bold text-amber tabular-nums">
                      {balances.lockedFormatted}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Switch user selector */}
            <div className="flex items-center bg-surface border border-line rounded-full px-2.5 py-1 text-xs shadow-xs">
              <span className="text-muted mr-1.5 hidden lg:inline text-[11px]">User:</span>
              <select
                suppressHydrationWarning
                value={mounted ? currentUserId : 1}
                onChange={(e) => setCurrentUserId(parseInt(e.target.value, 10))}
                className="bg-transparent text-xs font-semibold text-ink focus:outline-none cursor-pointer pr-1"
                aria-label="Switch User"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-surface text-ink">
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* MoonPay Style Trade CTA */}
            <Link
              href="/marketplace"
              className="btn-moonpay px-4 py-1.5 text-xs font-semibold hidden sm:inline-flex items-center gap-1.5"
            >
              <span>Trade Now</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-line bg-surface hover:bg-surface-subtle text-muted hover:text-ink transition-colors"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mounted && isDark ? (
                <svg className="w-4 h-4 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[#7D00FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
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
            className={`px-3 py-1 whitespace-nowrap rounded-full font-medium ${
              pathname === item.href
                ? "text-[#7D00FF] font-bold bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50"
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
