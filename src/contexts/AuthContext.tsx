"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "affiliate";
  avatarUrl: string | null;
  phone: string | null;
  company: string | null;
  status: string;
}

interface AuthAffiliate {
  id: string;
  userId: string;
  referralCode: string;
  tier: string;
  commissionRate: number;
  totalEarnings: number;
  totalReferrals: number;
  totalConversions: number;
  balance: number;
  payoutMethod: string;
  status: string;
}

interface AuthContextType {
  user: AuthUser | null;
  affiliate: AuthAffiliate | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [affiliate, setAffiliate] = useState<AuthAffiliate | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const savedToken = token || localStorage.getItem("elevateme_token");
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setAffiliate(data.affiliate || null);
        if (!token) setToken(savedToken);
      } else {
        localStorage.removeItem("elevateme_token");
        setToken(null);
        setUser(null);
        setAffiliate(null);
      }
    } catch {
      localStorage.removeItem("elevateme_token");
      setToken(null);
      setUser(null);
      setAffiliate(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const savedToken = localStorage.getItem("elevateme_token");
    if (savedToken) {
      setToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      localStorage.setItem("elevateme_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem("elevateme_token");
      setToken(null);
      setUser(null);
      setAffiliate(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, affiliate, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper hook for API calls with auth
export function useApiClient() {
  const { token } = useAuth();

  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    return res;
  };

  return { apiCall };
}
