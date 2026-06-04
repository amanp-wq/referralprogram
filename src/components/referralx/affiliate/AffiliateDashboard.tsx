"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge, CopyButton, ProgressBar } from "../shared";
import {
  DollarSign, MousePointer, ShoppingBag, Percent, Copy, BarChart3,
  RefreshCw, AlertCircle, ExternalLink, Link2, TrendingUp, Download,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface DashboardKpis {
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  balance: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: string | number;
  totalReferrals: number;
}

interface DashboardLink {
  id: string;
  affiliateId: string;
  programId: string;
  code: string;
  url: string;
  clicks: number;
  conversions: number;
  isActive: boolean;
  label: string | null;
  createdAt: string;
}

interface RecentReferral {
  id: string;
  affiliateId: string;
  programId: string;
  linkId: string;
  referralCode: string;
  visitorEmail: string | null;
  visitorName: string | null;
  visitorIp: string | null;
  source: string | null;
  status: string;
  convertedAt: string | null;
  createdAt: string;
}

interface RecentPayout {
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

interface MonthlyEarning {
  month: string;
  amount: number;
}

interface DashboardData {
  affiliate: any;
  kpis: DashboardKpis;
  links: DashboardLink[];
  recentReferrals: RecentReferral[];
  recentPayouts: RecentPayout[];
  monthlyEarnings: MonthlyEarning[];
  sources: Record<string, number>;
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

export function AffiliateDashboard() {
  const { affiliate, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7D" | "30D" | "90D">("30D");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/affiliate/dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load dashboard");
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

  const referralLink = affiliate
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${affiliate.referralCode}`
    : "";

  const totalClicks = data?.kpis.totalClicks ?? 0;
  const totalConversions = data?.kpis.totalConversions ?? 0;
  const conversionRate = data?.kpis.conversionRate ?? "0";
  const avgCommission = totalConversions > 0 && data
    ? data.kpis.totalEarnings / totalConversions
    : 0;

  const handleExportCSV = () => {
    const referrals = data?.recentReferrals || [];
    const headers = ["Visitor", "Source", "Date", "Status"];
    const rows = referrals.map((r) => [
      r.visitorName || r.visitorEmail || "Anonymous",
      r.source || "direct",
      formatDate(r.createdAt),
      r.status,
    ]);
    downloadCSV("recent-referrals.csv", headers, rows);
    toast({ title: "Export complete", description: "Referrals CSV downloaded successfully" });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load dashboard</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-rx-primary to-rx-primary-dark rounded-2xl px-8 py-7 text-white relative overflow-hidden">
        <div className="absolute -top-1/2 -right-[20%] w-[400px] h-[400px] bg-white/5 rounded-full" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              Welcome back{affiliate ? `, ${affiliate.referralCode}` : ""}!
            </h2>
            <p className="text-white/85 max-w-lg text-sm">
              {loading ? (
                <Skeleton className="h-4 w-80 bg-white/20" />
              ) : data ? (
                <>
                  You have earned <strong>{formatCurrency(data.kpis.totalEarnings)}</strong> this month.
                  Your referral link generated <strong>{totalClicks.toLocaleString()} clicks</strong> and{" "}
                  <strong>{totalConversions} conversions</strong>.
                </>
              ) : (
                "Loading your dashboard data..."
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <CopyButton text={referralLink} label={<><Copy className="w-4 h-4" /> Copy Link</>} />
            <button
              onClick={() => window.location.href = "/dashboard?tab=earnings"}
              className="px-4 py-2.5 border border-white/40 rounded-lg text-sm font-semibold hover:bg-white/10 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" /> View Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-rx-gray-200">
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-4 w-32" />
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
            label="Total Clicks"
            value={totalClicks.toLocaleString()}
            iconColor="success"
            icon={<MousePointer className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Conversions"
            value={totalConversions.toLocaleString()}
            iconColor="warning"
            icon={<ShoppingBag className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Conversion Rate"
            value={`${conversionRate}%`}
            iconColor="danger"
            icon={<Percent className="w-[18px] h-[18px]" />}
          />
        </div>
      )}

      {/* Referral Link Section */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-rx-gray-800">Your Referral Link</h3>
          {affiliate?.status === "active" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rx-secondary-light text-rx-secondary rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-rx-secondary rounded-full" /> Active
            </span>
          )}
        </div>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-3 border border-rx-gray-200 rounded-lg font-mono text-sm bg-rx-gray-50 text-rx-gray-700"
          />
          <CopyButton text={referralLink} label="Copy Link" />
        </div>
        <div className="flex gap-6 pt-4 border-t border-rx-gray-100">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))
          ) : (
            <>
              <div>
                <div className="text-xs text-rx-gray-500">Clicks (30d)</div>
                <div className="text-lg font-bold text-rx-gray-900">{totalClicks.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-rx-gray-500">Conversions</div>
                <div className="text-lg font-bold text-rx-gray-900">{totalConversions}</div>
              </div>
              <div>
                <div className="text-xs text-rx-gray-500">Earnings</div>
                <div className="text-lg font-bold text-rx-gray-900">{formatCurrency(data?.kpis.totalEarnings ?? 0)}</div>
              </div>
              <div>
                <div className="text-xs text-rx-gray-500">Avg. Commission</div>
                <div className="text-lg font-bold text-rx-gray-900">{formatCurrency(avgCommission)}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Earnings Overview + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-rx-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-rx-gray-800">Earnings Overview</h3>
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
                      className="flex-1 bg-gradient-to-t from-rx-primary to-rx-primary/60 rounded-t-md hover:from-rx-primary-dark hover:to-rx-primary transition-all group relative"
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

        {/* Top/Source Breakdown */}
        <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
          <h3 className="text-base font-semibold text-rx-gray-800 mb-5">Traffic Sources</h3>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="w-7 h-7 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          ) : data?.sources && Object.keys(data.sources).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(data.sources).map(([source, count], i) => {
                const icons: Record<string, React.ReactNode> = {
                  social: <ExternalLink className="w-4 h-4" />,
                  email: <Link2 className="w-4 h-4" />,
                  website: <BarChart3 className="w-4 h-4" />,
                  direct: <MousePointer className="w-4 h-4" />,
                };
                const colors: Record<string, string> = {
                  social: "bg-rx-primary-light text-rx-primary",
                  email: "bg-rx-secondary-light text-rx-secondary",
                  website: "bg-rx-warning-light text-rx-warning",
                  direct: "bg-rx-info-light text-rx-info",
                };
                return (
                  <div key={source} className="flex items-center gap-3 p-3 rounded-lg hover:bg-rx-gray-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${colors[source] || "bg-rx-gray-100 text-rx-gray-600"}`}>
                      {icons[source] || <Link2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-rx-gray-800 truncate capitalize">{source}</div>
                      <div className="text-xs text-rx-gray-500">{count} referrals</div>
                    </div>
                    <div className="text-sm font-bold text-rx-secondary">{count}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
              <p className="text-sm text-rx-gray-500">No traffic source data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Payout Overview */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-rx-gray-800">Payout Overview</h3>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-rx-gray-50 rounded-xl">
                <Skeleton className="h-3 w-28 mb-2" />
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-36 mb-2" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { label: "Available Balance", value: formatCurrency(data?.kpis.balance ?? 0), sub: "Ready to withdraw", progress: 72 },
              { label: "Pending Balance", value: formatCurrency(data?.kpis.pendingEarnings ?? 0), sub: "Processing (3-5 days)", progress: 35 },
              { label: "Total Earnings", value: formatCurrency(data?.kpis.approvedEarnings ?? 0), sub: "Since joining", progress: 100 },
            ].map((item) => (
              <div key={item.label} className="p-4 bg-rx-gray-50 rounded-xl">
                <div className="text-xs text-rx-gray-500 font-medium mb-1">{item.label}</div>
                <div className="text-2xl font-bold text-rx-gray-900 mb-1">{item.value}</div>
                <div className="text-xs text-rx-gray-400 mb-2">{item.sub}</div>
                <ProgressBar value={item.progress} color="primary" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Conversions / Referrals */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Recent Referrals</h3>
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
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : data?.recentReferrals && data.recentReferrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Visitor</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentReferrals.map((r) => (
                  <tr key={r.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-semibold text-rx-gray-800">{r.visitorName || r.visitorEmail || "Anonymous"}</div>
                      {r.visitorEmail && <div className="text-xs text-rx-gray-500">{r.visitorEmail}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-700 capitalize">{r.source || "direct"}</td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
            <p className="text-sm text-rx-gray-500">No referrals yet. Share your link to start earning!</p>
          </div>
        )}
      </div>
    </div>
  );
}
