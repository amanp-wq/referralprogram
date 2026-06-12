"use client";
import { useState, useEffect, useCallback } from "react";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, SectionCard, ErrorWithRetry, EmptyState, formatCurrency, formatDate, timeAgo, getInitials } from "../shared";
import { Users, Share2, Percent, Zap, RefreshCw, Download, TrendingUp, Send, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface DashboardKpis {
  activeAffiliates: number;
  inactiveAffiliates: number;
  totalReferrals: number;
  conversionRate: number | string;
}

interface TopAffiliate {
  id: string;
  referralCode: string;
  tier: string;
  totalEarnings: number;
  totalReferrals: number;
  totalConversions: number;
  phone?: string;
  status: string;
  User?: { name: string; email: string; phone?: string; avatarUrl: string | null };
}

interface Activity {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

interface DashboardData {
  kpis: DashboardKpis;
  topAffiliates: TopAffiliate[];
  activities: Activity[];
  recentReferralActivities: Activity[];
  sources: Record<string, number>;
  totalReferralsChart: ChartDataPoint[];
  enrolledReferralsChart: ChartDataPoint[];
}

const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  created_affiliate: { icon: <Users className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary" },
  created_payout: { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-rx-primary-light text-rx-primary" },
  conversion: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info" },
  default: { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info" },
};

const referralActivityIcons: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  referral_submitted: { icon: <Send className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-600", label: "Submitted" },
  referral_click: { icon: <ExternalLink className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info", label: "Link Opened" },
  status_changed_enrolled: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary", label: "Enrolled" },
  status_changed_other: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-600", label: "Status Changed" },
};

function getReferralActivityMeta(action: string, details?: string) {
  if (action === "referral_submitted") return referralActivityIcons.referral_submitted;
  if (action === "referral_click") return referralActivityIcons.referral_click;
  if (action === "status_changed") {
    const isEnrolled = details?.toLowerCase().includes("enrolled");
    return isEnrolled ? referralActivityIcons.status_changed_enrolled : referralActivityIcons.status_changed_other;
  }
  return { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info", label: action };
}

function getActivityMeta(action: string) {
  for (const [key, val] of Object.entries(activityIcons)) {
    if (action.includes(key) || key === action) return val;
  }
  return activityIcons.default;
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

export function AdminDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<"7D" | "30D" | "90D">("30D");

  const fetchData = useCallback(async (period?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (period) params.set("period", period);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/admin/dashboard${query}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load dashboard");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchData(chartPeriod); }, [token, fetchData, chartPeriod]);

  const handlePeriodChange = (p: "7D" | "30D" | "90D") => {
    setChartPeriod(p);
  };

  const handleExportAmbassadors = () => {
    if (!topAffiliates || topAffiliates.length === 0) {
      toast({ title: "No data to export", description: "There are no ambassadors to export." });
      return;
    }
    const headers = ["Name", "Email", "Phone", "Referral Code", "Referrals", "Conversions", "Earnings", "Conversion Ratio", "Status"];
    const rows = topAffiliates.map((a) => {
      const name = (a as any).name || (a as any).User?.name || a.referralCode || "Unknown";
      const email = (a as any).email || (a as any).User?.email || "";
      const phone = (a as any).phone || (a as any).User?.phone || "";
      const conversionRatio = a.totalReferrals > 0 ? ((a.totalConversions / a.totalReferrals) * 100).toFixed(1) + "%" : "0%";
      return [
        `"${name}"`,
        `"${email}"`,
        `"${phone}"`,
        a.referralCode || "",
        String(a.totalReferrals || 0),
        String(a.totalConversions || 0),
        String(a.totalEarnings || 0),
        conversionRatio,
        a.status || "",
      ];
    });
    downloadCSV("top-ambassadors.csv", headers, rows);
    toast({ title: "Export complete", description: "Top ambassadors CSV downloaded." });
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={() => fetchData(chartPeriod)} />;
  }

  const kpis = data?.kpis;
  const topAffiliates = data?.topAffiliates || [];
  const activities = data?.activities || [];
  const recentReferralActivities = data?.recentReferralActivities || [];

  // Chart data from API
  const totalChart = data?.totalReferralsChart || [];
  const enrolledChart = data?.enrolledReferralsChart || [];

  const maxTotal = Math.max(...totalChart.map((m) => m.value || 0), 1);
  const maxEnrolled = Math.max(...enrolledChart.map((m) => m.value || 0), 1);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Active Ambassadors" value={kpis?.activeAffiliates?.toLocaleString() || "0"} iconColor="success" icon={<Users className="w-[18px] h-[18px]" />} context="Referred in last 60 days" onClick={() => onNavigate?.("affiliates")} />
            <KpiCard label="Inactive Ambassadors" value={kpis?.inactiveAffiliates?.toLocaleString() || "0"} iconColor="danger" icon={<Users className="w-[18px] h-[18px]" />} context="60+ days since last referral" onClick={() => onNavigate?.("affiliates")} />
            <KpiCard label="Total Referrals" value={kpis?.totalReferrals?.toLocaleString() || "0"} iconColor="warning" icon={<Share2 className="w-[18px] h-[18px]" />} onClick={() => onNavigate?.("referrals")} />
            <KpiCard label="Conversion Rate" value={`${kpis?.conversionRate || 0}%`} iconColor="primary" icon={<Percent className="w-[18px] h-[18px]" />} context="Enrolled / Total referrals" onClick={() => onNavigate?.("referrals")} />
          </>
        )}
      </div>

      {/* Charts: Total Referrals + Enrolled Referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Total Referrals Chart */}
        <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-rx-gray-800">Total Referrals</h3>
            <div className="flex gap-2">
              {(["7D", "30D", "90D"] as const).map((p) => (
                <button key={p} onClick={() => handlePeriodChange(p)} className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${chartPeriod === p ? "border-rx-primary text-rx-primary bg-rx-primary-light" : "border-rx-gray-200 text-rx-gray-600"}`}>{p}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-[280px] flex items-end gap-2 px-2">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="flex-1 bg-rx-gray-100 rounded-t-md animate-pulse" style={{ height: "100%" }} />)}</div>
          ) : totalChart.length === 0 ? (
            <EmptyState title="No referral data yet" description="Referral data will appear here once referrals come in" />
          ) : (
            <>
              <div className="h-[280px] flex items-end gap-2 px-2">
                {totalChart.map((m, i: number) => {
                  const val = m.value || 0;
                  return (
                    <div key={i} className="flex-1 bg-gradient-to-t from-rx-primary to-rx-primary/60 rounded-t-md hover:from-rx-primary-dark hover:to-rx-primary transition-all cursor-pointer group relative" style={{ height: `${maxTotal > 0 ? (val / maxTotal) * 100 : 0}%`, minHeight: val > 0 ? "4px" : "0" }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rx-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{val}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-2 text-xs text-rx-gray-400 overflow-hidden">
                {totalChart.filter((_, i) => {
                  const len = totalChart.length;
                  if (len <= 10) return true;
                  return i % Math.ceil(len / 10) === 0 || i === len - 1;
                }).map((m, i, arr) => <span key={i}>{m.label}</span>)}
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
                <button key={p} onClick={() => handlePeriodChange(p)} className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${chartPeriod === p ? "border-rx-primary text-rx-primary bg-rx-primary-light" : "border-rx-gray-200 text-rx-gray-600"}`}>{p}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-[280px] flex items-end gap-2 px-2">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="flex-1 bg-rx-gray-100 rounded-t-md animate-pulse" style={{ height: "100%" }} />)}</div>
          ) : enrolledChart.length === 0 ? (
            <EmptyState title="No enrolled data yet" description="Enrolled referral data will appear here" />
          ) : (
            <>
              <div className="h-[280px] flex items-end gap-2 px-2">
                {enrolledChart.map((m, i: number) => {
                  const val = m.value || 0;
                  return (
                    <div key={i} className="flex-1 bg-gradient-to-t from-rx-secondary to-rx-secondary/60 rounded-t-md hover:from-[#059669] hover:to-rx-secondary transition-all cursor-pointer group relative" style={{ height: `${maxEnrolled > 0 ? (val / maxEnrolled) * 100 : 0}%`, minHeight: val > 0 ? "4px" : "0" }}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rx-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{val}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-2 text-xs text-rx-gray-400 overflow-hidden">
                {enrolledChart.filter((_, i) => {
                  const len = enrolledChart.length;
                  if (len <= 10) return true;
                  return i % Math.ceil(len / 10) === 0 || i === len - 1;
                }).map((m, i) => <span key={i}>{m.label}</span>)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions - Only "Run Report" */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Zap className="w-5 h-5" />, color: "bg-[#ffedd5] text-[#ea580c]", title: "Run Report", desc: "Generate analytics" },
        ].map((a) => (
          <div key={a.title} onClick={() => { window.location.href = "/dashboard?tab=reports"; }} className="bg-white rounded-xl p-4 border border-rx-gray-200 flex items-center gap-3 cursor-pointer hover:border-rx-primary hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${a.color}`}>{a.icon}</div>
            <div><div className="text-sm font-semibold text-rx-gray-800">{a.title}</div><div className="text-xs text-rx-gray-500">{a.desc}</div></div>
          </div>
        ))}
      </div>

      {/* Top Ambassadors + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
            <h3 className="text-base font-semibold text-rx-gray-800">Top Ambassadors</h3>
            <div className="flex gap-2">
              <button onClick={() => fetchData(chartPeriod)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><RefreshCw className="w-3 h-3" /> Refresh</button>
              <button onClick={handleExportAmbassadors} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3" /> Export</button>
            </div>
          </div>
          {loading ? (
            <div className="p-5 space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3 animate-pulse"><div className="w-9 h-9 bg-rx-gray-200 rounded-full" /><div className="flex-1"><div className="h-4 w-32 bg-rx-gray-100 rounded mb-1" /><div className="h-3 w-24 bg-rx-gray-100 rounded" /></div></div>)}</div>
          ) : topAffiliates.length === 0 ? (
            <EmptyState title="No ambassadors yet" description="Ambassadors will appear here as they join" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Ambassador</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Referrals</th><th className="px-5 py-3">Earnings</th><th className="px-5 py-3">Conversion Ratio</th><th className="px-5 py-3">Status</th></tr></thead>
                <tbody>
                  {topAffiliates.map((a) => {
                    const name = (a as any).name || (a as any).User?.name || a.referralCode || "Unknown";
                    const email = (a as any).email || (a as any).User?.email || "";
                    const phone = (a as any).phone || (a as any).User?.phone || "-";
                    const initials = getInitials(name);
                    const conversionRatio = a.totalReferrals > 0 ? ((a.totalConversions / a.totalReferrals) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={a.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                        <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar initials={initials} src={(a as any).avatarUrl || (a as any).User?.avatarUrl} /><div><div className="text-sm font-semibold text-rx-gray-800">{name}</div><div className="text-xs text-rx-gray-500">{email}</div></div></div></td>
                        <td className="px-5 py-3.5 text-sm text-rx-gray-700">{phone}</td>
                        <td className="px-5 py-3.5 text-sm text-rx-gray-700">{a.totalReferrals || 0}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(a.totalEarnings || 0)}</td>
                        <td className="px-5 py-3.5"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-rx-gray-800">{conversionRatio}%</span><div className="w-16 h-1.5 bg-rx-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full bg-rx-primary" style={{ width: `${Math.min(100, parseFloat(conversionRatio))}%` }} /></div></div></td>
                        <td className="px-5 py-3.5"><StatusBadge status={a.status as any} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <SectionCard title="Recent Activity" actions={<button onClick={() => onNavigate?.('activity')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Zap className="w-3 h-3" /> View All</button>}>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex gap-3 animate-pulse"><div className="w-9 h-9 bg-rx-gray-200 rounded-lg" /><div className="flex-1"><div className="h-4 w-full bg-rx-gray-100 rounded mb-1" /><div className="h-3 w-16 bg-rx-gray-100 rounded" /></div></div>)}</div>
          ) : activities.length === 0 ? (
            <EmptyState title="No activity yet" description="Activity will appear here as actions occur" />
          ) : (
            <div className="space-y-4">
              {activities.map((a, i) => {
                const meta = getActivityMeta(a.action);
                return (
                  <div key={a.id} className={`flex gap-3 ${i < activities.length - 1 ? "pb-4 border-b border-rx-gray-100" : ""}`}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>{meta.icon}</div>
                    <div>
                      <div className="text-sm text-rx-gray-700 leading-relaxed">{a.details || a.action}</div>
                      <div className="text-xs text-rx-gray-400 mt-1">{timeAgo(a.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent Referral Activity */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Recent Referral Activity</h3>
          <button onClick={() => onNavigate?.('activity')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Zap className="w-3 h-3" /> View All</button>
        </div>
        {loading ? (
          <div className="p-5 space-y-4">{Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 bg-rx-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 w-full bg-rx-gray-100 rounded mb-1" />
                <div className="h-3 w-16 bg-rx-gray-100 rounded" />
              </div>
            </div>
          ))}</div>
        ) : recentReferralActivities.length === 0 ? (
          <EmptyState title="No referral activity yet" description="Referral activity will appear here as referrals are submitted and tracked" />
        ) : (
          <div className="p-5 space-y-4">
            {recentReferralActivities.map((a, i) => {
              const meta = getReferralActivityMeta(a.action, a.details);
              return (
                <div key={a.id} className={`flex gap-3 ${i < recentReferralActivities.length - 1 ? "pb-4 border-b border-rx-gray-100" : ""}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-rx-gray-500 uppercase tracking-wide">{meta.label}</span>
                    </div>
                    <div className="text-sm text-rx-gray-700 leading-relaxed mt-0.5">{a.details || a.action}</div>
                    <div className="text-xs text-rx-gray-400 mt-1">{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
