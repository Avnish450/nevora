"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface User {
  id: number;
  name: string;
  role: "seller" | "buyer" | "admin";
}

export interface Balances {
  available: string;
  locked: string;
  availableFormatted: string;
  lockedFormatted: string;
}

interface UserContextType {
  currentUser: User | null;
  balances: Balances | null;
  users: User[];
  currentUserId: number;
  setCurrentUserId: (id: number) => void;
  refreshUser: () => Promise<void>;
  fetchWithUser: (url: string, options?: RequestInit) => Promise<Response>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUserId, setCurrentUserIdState] = useState<number>(1); // Default Alice (1)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("nevora_user_id");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) setCurrentUserIdState(parsed);
    }
  }, []);

  const setCurrentUserId = (id: number) => {
    setCurrentUserIdState(id);
    localStorage.setItem("nevora_user_id", id.toString());
    document.cookie = `nevora_user_id=${id}; path=/; max-age=86400`;
  };

  const fetchWithUser = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      headers.set("x-user-id", currentUserId.toString());
      return fetch(url, { ...options, headers });
    },
    [currentUserId]
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetchWithUser("/api/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setBalances(data.balances);
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    }
  }, [fetchWithUser]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    refreshUser();
  }, [currentUserId, refreshUser]);

  return (
    <UserContext.Provider
      value={{
        currentUser,
        balances,
        users,
        currentUserId,
        setCurrentUserId,
        refreshUser,
        fetchWithUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
