"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge, CopyButton } from "../shared";
import {
  DollarSign, Users, UserCheck, Percent, Copy, BarChart3,
  RefreshCw, AlertCircle, ExternalLink, Link2, TrendingUp, Download,
  Share2, MessageCircle,
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

interface MonthlyEarning {
  month: string;
  amount: number;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

interface DashboardData {
  affiliate: any;
  kpis: DashboardKpis;
  links: DashboardLink[];
  recentReferrals: RecentReferral[];
  monthlyEarnings: MonthlyEarning[];
  totalReferralsChart: ChartDataPoint[];
  enrolledReferralsChart: ChartDataPoint[];
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

function getDaysSince(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getReferralStatus(ref: RecentReferral): string {
  if (ref.status === "completed" || ref.status === "converted" || ref.status === "enrolled") return "enrolled";
  if (ref.status === "submitted") return "submitted";
  if (ref.status === "opened" || ref.status === "clicked") return "opened";
  const daysSince = getDaysSince(ref.createdAt);
  if (ref.status === "pending") {
    if (daysSince > 30) return "not enrolled";
    return "pending";
  }
  return ref.status;
}

export function AffiliateDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
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

  const totalReferrals = data?.kpis.totalReferrals ?? 0;
  const enrolledCount = data?.recentReferrals
    ? data.recentReferrals.filter((r) => getReferralStatus(r) === "enrolled").length
    : 0;
  const conversionRatio = totalReferrals > 0 ? ((enrolledCount / totalReferrals) * 100).toFixed(1) : "0";

  // Use real chart data from API
  const totalChartData = data?.totalReferralsChart || [];
  const enrolledChartData = data?.enrolledReferralsChart || [];
  const maxTotalVal = Math.max(...totalChartData.map((d) => d.value), 1);
  const maxEnrolledVal = Math.max(...enrolledChartData.map((d) => d.value), 1);

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

  // Social share helpers
  const shareMessage = `Join ElevateMe using my referral link! 🚀`;
  const shareSubject = "Join ElevateMe - Referral Invitation";

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage + " " + referralLink)}`, "_blank");
  };
  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, "_blank");
  };
  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`, "_blank");
  };
  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, "_blank");
  };
  const shareViaEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareMessage + "\n\n" + referralLink)}`;
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
      <div className="bg-gradient-to-br from-rx-secondary to-[#4a7a58] rounded-2xl px-8 py-7 text-white relative overflow-hidden">
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
                  You have earned <strong>{formatCurrency(data.kpis.totalEarnings)}</strong> total.
                  Your referral link generated <strong>{totalReferrals} referrals</strong> with{" "}
                  <strong>{enrolledCount} enrolled</strong>.
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
            onClick={() => onNavigate?.("earnings")}
          />
          <KpiCard
            label="Total Referrals"
            value={totalReferrals.toLocaleString()}
            iconColor="success"
            icon={<Users className="w-[18px] h-[18px]" />}
            onClick={() => onNavigate?.("referrals")}
          />
          <KpiCard
            label="Enrolled"
            value={enrolledCount.toLocaleString()}
            iconColor="warning"
            icon={<UserCheck className="w-[18px] h-[18px]" />}
            onClick={() => onNavigate?.("referrals")}
          />
          <KpiCard
            label="Conversion Ratio"
            value={`${conversionRatio}%`}
            iconColor="danger"
            icon={<Percent className="w-[18px] h-[18px]" />}
            onClick={() => onNavigate?.("referrals")}
          />
        </div>
      )}

      {/* Referral Link Section - BIGGER */}
      <div className="bg-gradient-to-br from-rx-secondary to-[#4a7a58] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-5">
          <img src="/logo.svg" alt="ElevateMe" className="h-10 w-10" />
          <div>
            <h3 className="text-xl font-bold">Your Ambassador Referral Link</h3>
            <p className="text-white/70 text-sm">Share this link to start earning commissions</p>
          </div>
          {affiliate?.status === "active" && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 text-white rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 bg-white rounded-full" /> Active
            </span>
          )}
        </div>
        <div className="flex gap-3 mb-5">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-5 py-4 border border-white/20 rounded-xl font-mono text-base bg-white/10 text-white placeholder-white/50"
          />
          <CopyButton text={referralLink} label={<><Copy className="w-4 h-4" /> Copy Link</>} />
        </div>
        {/* Social Share Buttons */}
        <div className="flex flex-wrap gap-3 pt-5 border-t border-white/20">
          <span className="text-white/60 text-sm font-medium self-center mr-1">Share via:</span>
          <button
            onClick={shareOnWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-lg text-sm font-semibold hover:bg-[#1da851] transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button
            onClick={shareOnFacebook}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#1565C0] transition-colors"
          >
            <Share2 className="w-4 h-4" /> Facebook
          </button>
          <button
            onClick={shareOnTwitter}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1DA1F2] text-white rounded-lg text-sm font-semibold hover:bg-[#0C85D0] transition-colors"
          >
            <Share2 className="w-4 h-4" /> Twitter/X
          </button>
          <button
            onClick={shareOnLinkedIn}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0A66C2] text-white rounded-lg text-sm font-semibold hover:bg-[#084d94] transition-colors"
          >
            <Share2 className="w-4 h-4" /> LinkedIn
          </button>
          <button
            onClick={shareViaEmail}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white rounded-lg text-sm font-semibold hover:bg-white/25 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Email
          </button>
        </div>
      </div>

      {/* Two Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Total Referrals Chart */}
        <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-rx-gray-800">Total Referrals</h3>
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
            <div className="h-[250px] flex items-end gap-2 px-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${30 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (
            <>
              <div className="h-[250px] flex items-end gap-2 px-2">
                {totalChartData.map((d, i) => {
                  const pct = maxTotalVal > 0 ? (d.value / maxTotalVal) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-rx-primary to-rx-primary/60 rounded-t-md hover:from-rx-primary-dark hover:to-rx-primary transition-all group relative"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    >
                      {d.value > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rx-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {d.value} referrals
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-2 text-xs text-rx-gray-400 overflow-hidden">
                {totalChartData.filter((_, i) => {
                  const len = totalChartData.length;
                  if (len <= 10) return true;
                  return i % Math.ceil(len / 10) === 0 || i === len - 1;
                }).map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Enrolled Referrals Chart */}
        <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-rx-gray-800">Enrolled Referrals</h3>
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
            <div className="h-[250px] flex items-end gap-2 px-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${30 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (
            <>
              <div className="h-[250px] flex items-end gap-2 px-2">
                {enrolledChartData.map((d, i) => {
                  const pct = maxEnrolledVal > 0 ? (d.value / maxEnrolledVal) * 100 : 0;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-rx-secondary to-rx-secondary/60 rounded-t-md hover:from-[#059669] hover:to-rx-secondary transition-all group relative"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    >
                      {d.value > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rx-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {d.value} enrolled
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-2 text-xs text-rx-gray-400 overflow-hidden">
                {enrolledChartData.filter((_, i) => {
                  const len = enrolledChartData.length;
                  if (len <= 10) return true;
                  return i % Math.ceil(len / 10) === 0 || i === len - 1;
                }).map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Traffic Sources */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
        <h3 className="text-base font-semibold text-rx-gray-800 mb-5">Traffic Sources</h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                <Skeleton className="w-7 h-7 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-20 mb-1" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.sources && Object.keys(data.sources).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {Object.entries(data.sources).map(([source, count]) => {
              const icons: Record<string, React.ReactNode> = {
                social: <ExternalLink className="w-4 h-4" />,
                email: <ExternalLink className="w-4 h-4" />,
                website: <BarChart3 className="w-4 h-4" />,
                direct: <Users className="w-4 h-4" />,
                whatsapp: <MessageCircle className="w-4 h-4" />,
                facebook: <Share2 className="w-4 h-4" />,
                twitter: <Share2 className="w-4 h-4" />,
                linkedin: <Share2 className="w-4 h-4" />,
              };
              const colors: Record<string, string> = {
                social: "bg-rx-primary-light text-rx-primary",
                email: "bg-rx-secondary-light text-rx-secondary",
                website: "bg-rx-warning-light text-rx-warning",
                direct: "bg-rx-info-light text-rx-info",
                whatsapp: "bg-[#25D366]/15 text-[#25D366]",
                facebook: "bg-[#1877F2]/15 text-[#1877F2]",
                twitter: "bg-[#1DA1F2]/15 text-[#1DA1F2]",
                linkedin: "bg-[#0A66C2]/15 text-[#0A66C2]",
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

      {/* Recent Referrals */}
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
                      <StatusBadge status={getReferralStatus(r) as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
            <p className="text-sm text-rx-gray-500">No referrals yet. Share your link to start earning!</p>
          </div>
        )}
      </div>
    </div>
  );
}
