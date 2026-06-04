"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "../shared";
import {
  CreditCard, Building, Wallet, Filter, Download, ArrowUpRight,
  RefreshCw, AlertCircle, X, Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Payout {
  id: string;
  affiliateId: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface PayoutsData {
  payouts: Payout[];
  balance: number;
  pendingAmount: number;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AffiliatePayouts() {
  const { token, affiliate } = useAuth();
  const [data, setData] = useState<PayoutsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestMethod, setRequestMethod] = useState("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/payouts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load payouts");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestPayout = async () => {
    if (!token) return;
    setRequesting(true);
    setRequestError(null);
    try {
      const body: Record<string, any> = {};
      if (requestAmount) body.amount = parseFloat(requestAmount);
      if (requestMethod) body.method = requestMethod;

      const res = await fetch("/api/affiliate/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to request payout");
      }
      setShowRequestDialog(false);
      setRequestAmount("");
      setRequestMethod("");
      fetchData();
    } catch (err: any) {
      setRequestError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  // Determine payout methods from affiliate settings
  const payoutMethod = affiliate?.payoutMethod || "bank";
  const methods = [
    {
      icon: <Building className="w-5 h-5" />,
      name: "Bank Transfer",
      detail: "Primary",
      status: payoutMethod === "bank" ? "primary" : "connected",
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      name: "PayPal",
      detail: payoutMethod === "paypal" ? "Primary" : "Available",
      status: payoutMethod === "paypal" ? "primary" : "connected",
    },
    {
      icon: <Wallet className="w-5 h-5" />,
      name: "UPI",
      detail: payoutMethod === "upi" ? "Primary" : "Available",
      status: payoutMethod === "upi" ? "primary" : "connected",
    },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load payouts</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Banner */}
      <div className="bg-gradient-to-br from-rx-primary to-rx-primary-dark rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/70 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold">
              {loading ? <Skeleton className="h-10 w-32 bg-white/20" /> : formatCurrency(data?.balance ?? 0)}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {loading ? <Skeleton className="h-4 w-36 bg-white/20" /> : `${formatCurrency(data?.pendingAmount ?? 0)} pending`}
            </p>
          </div>
          <button
            onClick={() => setShowRequestDialog(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-rx-primary rounded-lg font-semibold hover:shadow-lg"
          >
            <ArrowUpRight className="w-4 h-4" /> Request Payout
          </button>
        </div>
      </div>

      {/* Request Payout Dialog */}
      {showRequestDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Request Payout</h3>
              <button onClick={() => { setShowRequestDialog(false); setRequestError(null); }} className="w-8 h-8 rounded-lg hover:bg-rx-gray-100 flex items-center justify-center text-rx-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Available Balance</label>
                <div className="text-2xl font-bold text-rx-secondary">{formatCurrency(data?.balance ?? 0)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Amount to Withdraw</label>
                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="Enter amount (min $50)"
                  min="50"
                  step="0.01"
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Payout Method</label>
                <select
                  value={requestMethod}
                  onChange={(e) => setRequestMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light bg-white"
                >
                  <option value="">Select method</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              {requestError && (
                <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium">{requestError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowRequestDialog(false); setRequestError(null); }}
                  className="flex-1 px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-700 hover:bg-rx-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPayout}
                  disabled={requesting}
                  className="flex-1 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requesting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : "Request Payout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-rx-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))
        ) : (
          methods.map((m) => (
            <div key={m.name} className={`bg-white rounded-2xl p-6 border ${m.status === "primary" ? "border-rx-primary/30" : "border-rx-gray-200"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  m.status === "primary"
                    ? "bg-rx-primary-light text-rx-primary"
                    : "bg-rx-gray-100 text-rx-gray-400"
                }`}>
                  {m.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-rx-gray-800">{m.name}</div>
                  <div className="text-xs text-rx-gray-500">{m.detail}</div>
                </div>
              </div>
              {m.status === "primary" && (
                <span className="text-xs font-semibold text-rx-primary">Default</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Payout History Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Payout History</h3>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50">
              <Filter className="w-3 h-3" /> Filter
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : data?.payouts && data.payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.payouts.map((p) => (
                  <tr key={p.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(p.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(p.amount)}</td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-700 capitalize">{p.method}</td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500 font-mono">{p.reference || "—"}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
            <p className="text-sm text-rx-gray-500">No payout history yet. Request a payout when your balance reaches $50.</p>
          </div>
        )}
      </div>
    </div>
  );
}
