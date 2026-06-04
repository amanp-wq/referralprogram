"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, ProgressBar, SectionCard, ErrorWithRetry, EmptyState, formatCurrency, formatDate, timeAgo, getInitials } from "../shared";
import { DollarSign, MousePointer, ShoppingBag, Percent, Users, Share2, Target, Link2, Zap, Plus, Download, Filter, ArrowRight, TrendingUp, RefreshCw, X, Cookie, CalendarDays, Activity } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DashboardKpis {
  totalRevenue: number;
  activeAffiliates: number;
  totalReferrals: number;
  conversionRate: number | string;
  pendingPayoutAmount: number;
}

interface TopAffiliate {
  id: string;
  referralCode: string;
  tier: string;
  totalEarnings: number;
  totalReferrals: number;
  totalConversions: number;
  status: string;
  User?: { name: string; email: string; avatarUrl: string | null };
}

interface ProgramStat {
  id: string;
  name: string;
  commissionType: string;
  commissionValue: number;
  isActive: boolean;
  affiliateCount: number;
  revenue: number;
  cookieDuration?: number;
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

interface DashboardData {
  kpis: DashboardKpis;
  topAffiliates: TopAffiliate[];
  programs: ProgramStat[];
  activities: Activity[];
  sources: Record<string, number>;
  monthlyRevenue: { month: string; revenue: number }[];
}

const activityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  created_affiliate: { icon: <Users className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary" },
  created_payout: { icon: <DollarSign className="w-3.5 h-3.5" />, color: "bg-rx-primary-light text-rx-primary" },
  created_program: { icon: <Target className="w-3.5 h-3.5" />, color: "bg-rx-warning-light text-rx-warning" },
  conversion: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info" },
  default: { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info" },
};

function getActivityMeta(action: string) {
  for (const [key, val] of Object.entries(activityIcons)) {
    if (action.includes(key) || key === action) return val;
  }
  return activityIcons.default;
}

const sourceLabels: Record<string, string> = { social: "Social Media", email: "Email", website: "Website", direct: "Direct" };
const sourceColors: Record<string, string> = { social: "bg-rx-primary", email: "bg-rx-secondary", website: "bg-rx-warning", direct: "bg-rx-info" };

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

export function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<"7D" | "30D" | "90D">("30D");
  const [selectedProgram, setSelectedProgram] = useState<ProgramStat | null>(null);
  const [showProgramDialog, setShowProgramDialog] = useState(false);

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

  useEffect(() => { if (token) fetchData(revenuePeriod); }, [token, fetchData, revenuePeriod]);

  const handlePeriodChange = (p: "7D" | "30D" | "90D") => {
    setRevenuePeriod(p);
  };

  const handleExportAffiliates = () => {
    if (!topAffiliates || topAffiliates.length === 0) {
      toast({ title: "No data to export", description: "There are no affiliates to export." });
      return;
    }
    const headers = ["Name", "Email", "Referral Code", "Tier", "Referrals", "Conversions", "Earnings", "Status"];
    const rows = topAffiliates.map((a) => {
      const name = (a as any).name || (a as any).User?.name || a.referralCode || "Unknown";
      const email = (a as any).email || (a as any).User?.email || "";
      return [
        `"${name}"`,
        `"${email}"`,
        a.referralCode || "",
        a.tier || "",
        String(a.totalReferrals || 0),
        String(a.totalConversions || 0),
        String(a.totalEarnings || 0),
        a.status || "",
      ];
    });
    downloadCSV("top-affiliates.csv", headers, rows);
    toast({ title: "Export complete", description: "Top affiliates CSV downloaded." });
  };

  const handleRefresh = () => {
    fetchData(revenuePeriod);
  };

  const handleViewProgram = (p: ProgramStat) => {
    setSelectedProgram(p);
    setShowProgramDialog(true);
  };

  const quickActionRoutes: Record<string, string> = {
    "Invite Affiliate": "/dashboard?tab=affiliates",
    "Create Program": "/dashboard?tab=programs",
    "Generate Link": "/dashboard?tab=links",
    "Run Report": "/dashboard?tab=reports",
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={() => fetchData(revenuePeriod)} />;
  }

  const kpis = data?.kpis;
  const topAffiliates = data?.topAffiliates || [];
  const programs = data?.programs || [];
  const activities = data?.activities || [];
  const sources = data?.sources || {};
  const monthlyRevenue = data?.monthlyRevenue || [];

  const totalSourcesValue = Object.values(sources).reduce((a, b) => a + b, 0);
  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Revenue" value={formatCurrency(kpis?.totalRevenue || 0)} iconColor="primary" icon={<DollarSign className="w-[18px] h-[18px]" />} />
            <KpiCard label="Active Affiliates" value={kpis?.activeAffiliates?.toLocaleString() || "0"} iconColor="success" icon={<Users className="w-[18px] h-[18px]" />} />
            <KpiCard label="Total Referrals" value={kpis?.totalReferrals?.toLocaleString() || "0"} iconColor="warning" icon={<Share2 className="w-[18px] h-[18px]" />} />
            <KpiCard label="Conversion Rate" value={`${kpis?.conversionRate || 0}%`} iconColor="danger" icon={<Percent className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

      {/* Revenue Trend + Referral Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-rx-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-rx-gray-800">Revenue Trend</h3>
            <div className="flex gap-2">
              {(["7D", "30D", "90D"] as const).map((p) => (
                <button key={p} onClick={() => handlePeriodChange(p)} className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${revenuePeriod === p ? "border-rx-primary text-rx-primary bg-rx-primary-light" : "border-rx-gray-200 text-rx-gray-600"}`}>{p}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="h-[300px] flex items-end gap-2 px-2">{Array.from({ length: 12 }).map((_, i) => <div key={i} className="flex-1 bg-rx-gray-100 rounded-t-md animate-pulse" style={{ height: "100%" }} />)}</div>
          ) : monthlyRevenue.length === 0 ? (
            <EmptyState title="No revenue data yet" description="Revenue data will appear here once commissions are earned" />
          ) : (
            <>
              <div className="h-[300px] flex items-end gap-2 px-2">
                {monthlyRevenue.map((m, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-rx-primary to-rx-primary/60 rounded-t-md hover:from-rx-primary-dark hover:to-rx-primary transition-all cursor-pointer group relative" style={{ height: `${maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0}%`, minHeight: m.revenue > 0 ? "4px" : "0" }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-rx-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{formatCurrency(m.revenue)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 px-2 text-xs text-rx-gray-400">
                {monthlyRevenue.map((m, i) => <span key={i}>{m.month}</span>)}
              </div>
            </>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
          <h3 className="text-base font-semibold text-rx-gray-800 mb-5">Referral Sources</h3>
          {loading ? (
            <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse"><div className="flex justify-between mb-1.5"><div className="h-4 w-24 bg-rx-gray-100 rounded" /><div className="h-4 w-10 bg-rx-gray-100 rounded" /></div><div className="w-full h-2 bg-rx-gray-100 rounded-full" /></div>)}</div>
          ) : totalSourcesValue === 0 ? (
            <EmptyState title="No source data" description="Sources will appear as referrals come in" />
          ) : (
            <div className="space-y-4">
              {Object.entries(sources).map(([key, val]) => (
                <div key={key}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-rx-gray-600">{sourceLabels[key] || key}</span>
                    <span className="text-sm font-semibold text-rx-gray-800">{totalSourcesValue > 0 ? Math.round((val / totalSourcesValue) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-rx-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sourceColors[key] || "bg-rx-gray-300"}`} style={{ width: `${totalSourcesValue > 0 ? (val / totalSourcesValue) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Programs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-rx-gray-200 animate-pulse">
              <div className="h-4 w-32 bg-rx-gray-200 rounded mb-2" /><div className="h-3 w-40 bg-rx-gray-100 rounded mb-4" />
              <div className="grid grid-cols-2 gap-4"><div><div className="h-3 w-16 bg-rx-gray-100 rounded mb-2" /><div className="h-6 w-12 bg-rx-gray-200 rounded" /></div><div><div className="h-3 w-16 bg-rx-gray-100 rounded mb-2" /><div className="h-6 w-12 bg-rx-gray-200 rounded" /></div></div>
            </div>
          ))
        ) : programs.length === 0 ? (
          <div className="md:col-span-3"><EmptyState title="No programs yet" description="Create your first referral program" /></div>
        ) : (
          programs.slice(0, 3).map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${p.isActive ? "bg-rx-primary" : "bg-rx-gray-300"}`} />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-rx-gray-800">{p.name}</h4>
                  <p className="text-xs text-rx-gray-500 mt-1">{p.commissionType === "percentage" ? `Percentage - ${p.commissionValue}%` : `Fixed - $${p.commissionValue}/referral`}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><div className="text-xs text-rx-gray-500">Affiliates</div><div className="text-xl font-bold text-rx-gray-900">{p.affiliateCount}</div></div>
                <div><div className="text-xs text-rx-gray-500">Revenue</div><div className="text-xl font-bold text-rx-gray-900">{formatCurrency(p.revenue)}</div></div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-rx-gray-100">
                <div className="flex -space-x-2">
                  <Avatar useLogo /><div className="w-7 h-7 rounded-full bg-rx-gray-100 border-2 border-white flex items-center justify-center text-rx-gray-600 text-[10px] font-semibold">+{Math.max(0, p.affiliateCount - 1)}</div>
                </div>
                <span onClick={() => handleViewProgram(p)} className="text-rx-primary text-[13px] font-semibold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">View <ArrowRight className="w-3 h-3" /></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Program Details Dialog */}
      {showProgramDialog && selectedProgram && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowProgramDialog(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Program Details</h3>
              <button onClick={() => setShowProgramDialog(false)} className="text-rx-gray-400 hover:text-rx-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-rx-gray-500">Name</span>
                <span className="text-sm font-semibold text-rx-gray-800">{selectedProgram.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-rx-gray-500">Commission Type</span>
                <span className="text-sm font-semibold text-rx-gray-800 capitalize">{selectedProgram.commissionType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-rx-gray-500">Commission Value</span>
                <span className="text-sm font-semibold text-rx-gray-800">
                  {selectedProgram.commissionType === "percentage" ? `${selectedProgram.commissionValue}%` : formatCurrency(selectedProgram.commissionValue)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-rx-gray-500">Affiliates</span>
                <span className="text-sm font-semibold text-rx-gray-800">{selectedProgram.affiliateCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-rx-gray-500">Revenue</span>
                <span className="text-sm font-semibold text-rx-gray-800">{formatCurrency(selectedProgram.revenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-rx-gray-500">Status</span>
                <StatusBadge status={selectedProgram.isActive ? "active" : "inactive"} />
              </div>
              {selectedProgram.cookieDuration != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-rx-gray-500">Cookie Duration</span>
                  <span className="text-sm font-semibold text-rx-gray-800">{selectedProgram.cookieDuration} days</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowProgramDialog(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Close</button>
              <button onClick={() => { setShowProgramDialog(false); window.location.href = "/dashboard?tab=programs"; }} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">Edit Program</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users className="w-5 h-5" />, color: "bg-[#dbeafe] text-[#2563eb]", title: "Invite Affiliate", desc: "Send invitation email" },
          { icon: <Target className="w-5 h-5" />, color: "bg-[#dcfce7] text-[#16a34a]", title: "Create Program", desc: "Set up new campaign" },
          { icon: <Link2 className="w-5 h-5" />, color: "bg-[#f3e8ff] text-[#9333ea]", title: "Generate Link", desc: "Create tracking link" },
          { icon: <Zap className="w-5 h-5" />, color: "bg-[#ffedd5] text-[#ea580c]", title: "Run Report", desc: "Generate analytics" },
        ].map((a) => (
          <div key={a.title} onClick={() => {
            const route = quickActionRoutes[a.title];
            if (route) window.location.href = route;
          }} className="bg-white rounded-xl p-4 border border-rx-gray-200 flex items-center gap-3 cursor-pointer hover:border-rx-primary hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${a.color}`}>{a.icon}</div>
            <div><div className="text-sm font-semibold text-rx-gray-800">{a.title}</div><div className="text-xs text-rx-gray-500">{a.desc}</div></div>
          </div>
        ))}
      </div>

      {/* Top Affiliates + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
            <h3 className="text-base font-semibold text-rx-gray-800">Top Affiliates</h3>
            <div className="flex gap-2">
              <button onClick={handleRefresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><RefreshCw className="w-3 h-3" /> Refresh</button>
              <button onClick={handleExportAffiliates} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3" /> Export</button>
            </div>
          </div>
          {loading ? (
            <div className="p-5 space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center gap-3 animate-pulse"><div className="w-9 h-9 bg-rx-gray-200 rounded-full" /><div className="flex-1"><div className="h-4 w-32 bg-rx-gray-100 rounded mb-1" /><div className="h-3 w-24 bg-rx-gray-100 rounded" /></div></div>)}</div>
          ) : topAffiliates.length === 0 ? (
            <EmptyState title="No affiliates yet" description="Affiliates will appear here as they join" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Affiliate</th><th className="px-5 py-3">Referrals</th><th className="px-5 py-3">Earnings</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Status</th></tr></thead>
                <tbody>
                  {topAffiliates.map((a) => {
                    const name = (a as any).name || (a as any).User?.name || a.referralCode || "Unknown";
                    const email = (a as any).email || (a as any).User?.email || "";
                    const initials = getInitials(name);
                    const maxEarnings = topAffiliates[0]?.totalEarnings || 1;
                    const progress = maxEarnings > 0 ? Math.round(((a.totalEarnings || 0) / maxEarnings) * 100) : 0;
                    return (
                      <tr key={a.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                        <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar initials={initials} src={(a as any).avatarUrl || (a as any).User?.avatarUrl} /><div><div className="text-sm font-semibold text-rx-gray-800">{name}</div><div className="text-xs text-rx-gray-500">{email}</div></div></div></td>
                        <td className="px-5 py-3.5 text-sm text-rx-gray-700">{a.totalReferrals || 0}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(a.totalEarnings || 0)}</td>
                        <td className="px-5 py-3.5"><ProgressBar value={progress} color="primary" /></td>
                        <td className="px-5 py-3.5"><StatusBadge status={a.status as any} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <SectionCard title="Recent Activity">
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
    </div>
  );
}
