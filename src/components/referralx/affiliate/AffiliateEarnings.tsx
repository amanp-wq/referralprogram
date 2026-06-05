"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge } from "../shared";
import {
  DollarSign, TrendingUp, Clock, CheckCircle, Download, RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface Commission {
  id: string;
  affiliateId: string;
  programId: string;
  referralId: string;
  amount: number;
  rate: number;
  type: string;
  status: string;
  description: string | null;
  createdAt: string;
}

interface EarningsKpis {
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  balance: number;
}

interface MonthlyEarning {
  month: string;
  amount: number;
}

interface EarningsData {
  commissions: Commission[];
  kpis: EarningsKpis;
  monthlyEarnings: MonthlyEarning[];
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AffiliateEarnings() {
  const { token } = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7D" | "30D" | "90D">("30D");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/affiliate/earnings?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load earnings");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const thisMonth = data?.monthlyEarnings?.length
    ? data.monthlyEarnings[data.monthlyEarnings.length - 1]?.amount ?? 0
    : 0;

  const handleExportCSV = () => {
    const commissions = data?.commissions || [];
    const headers = ["Date", "Description", "Type", "Amount", "Status"];
    const rows = commissions.map((c) => [
      formatDate(c.createdAt),
      c.description || c.type,
      c.type,
      c.amount < 0 ? `-${formatCurrency(Math.abs(c.amount))}` : formatCurrency(c.amount),
      c.status,
    ]);
    downloadCSV("earnings-history.csv", headers, rows);
    toast({ title: "Export complete", description: "Earnings CSV downloaded successfully" });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load earnings</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-rx-gray-200">
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            label="Total Earnings"
            value={formatCurrency(data?.kpis.totalEarnings ?? 0)}
            iconColor="primary"
            icon={<DollarSign className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="This Month"
            value={formatCurrency(thisMonth)}
            iconColor="success"
            icon={<TrendingUp className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Pending"
            value={formatCurrency(data?.kpis.pendingEarnings ?? 0)}
            iconColor="warning"
            icon={<Clock className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Approved"
            value={formatCurrency(data?.kpis.approvedEarnings ?? 0)}
            iconColor="danger"
            icon={<CheckCircle className="w-[18px] h-[18px]" />}
          />
        </div>
      )}

      {/* Earnings Over Time Chart */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-rx-gray-800">Earnings Over Time</h3>
          <div className="flex gap-2">
            {(["7D", "30D", "90D"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 border rounded-lg text-xs font-medium ${
                  period === p ? "border-rx-primary text-rx-primary bg-rx-primary-light" : "border-rx-gray-200 text-rx-gray-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-[300px] flex items-end gap-2 px-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${30 + Math.random() * 60}%` }} />
            ))}
          </div>
        ) : (
          <>
            <div className="h-[300px] flex items-end gap-2 px-2">
              {(data?.monthlyEarnings || []).map((m, i) => {
                const maxAmount = Math.max(...(data?.monthlyEarnings || []).map((e) => e.amount), 1);
                const pct = maxAmount > 0 ? (m.amount / maxAmount) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-rx-secondary to-rx-secondary/60 rounded-t-md hover:from-[#059669] hover:to-rx-secondary transition-all group relative"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  >
                    {m.amount > 0 && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rx-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(m.amount)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 px-2 text-xs text-rx-gray-400">
              {(data?.monthlyEarnings || []).map((m, i) => (
                <span key={i}>{m.month}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Earnings History Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Earnings History</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            >
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : data?.commissions && data.commissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.commissions.map((c) => (
                  <tr key={c.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-800">{c.description || c.type}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.type === "Commission" || c.type === "commission"
                          ? "bg-rx-secondary-light text-rx-secondary"
                          : c.type === "Refund" || c.type === "refund"
                          ? "bg-rx-danger-light text-rx-danger"
                          : "bg-rx-gray-100 text-rx-gray-600"
                      }`}>
                        {c.type}
                      </span>
                    </td>
                    <td className={`px-5 py-3.5 text-sm font-semibold ${c.amount < 0 ? "text-rx-danger" : "text-rx-secondary"}`}>
                      {c.amount < 0 ? "-" : ""}{formatCurrency(Math.abs(c.amount))}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
            <p className="text-sm text-rx-gray-500">No earnings history yet. Start sharing your referral link!</p>
          </div>
        )}
      </div>
    </div>
  );
}
