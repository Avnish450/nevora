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
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="min-h-full flex flex-col antialiased">
        <UserProvider>
          <Suspense fallback={<div className="h-16 bg-slate-900 border-b border-slate-800" />}>
            <Header />
          </Suspense>
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
              {children}
            </Suspense>
          </main>
          <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
            Nevora P2P Escrow Demo • Fake money only • No real blockchain or INR payments
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}
