import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/Header";

import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Nevora — P2P USDT/INR Marketplace with Escrow",
  description: "Working demo of Nevora P2P USDT/INR marketplace with double-entry ledger escrow.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-paper text-ink antialiased">
        <UserProvider>
          <Suspense fallback={<div className="h-14 bg-surface border-b border-line" />}>
            <Header />
          </Suspense>
          <main className="flex-1 max-w-[1180px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Suspense fallback={<div className="p-8 text-center text-xs font-mono text-muted">Loading...</div>}>
              {children}
            </Suspense>
          </main>
          <footer className="border-t border-line py-4 text-center text-[11px] text-muted">
            <p>Nevora · P2P Cryptocurrency Escrow Demo · Fake money only</p>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
