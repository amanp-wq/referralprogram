"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge, CopyButton, SectionCard, EmptyState, timeAgo } from "../shared";
import {
  DollarSign, Users, UserCheck, Percent, Copy, BarChart3,
  RefreshCw, AlertCircle, ExternalLink, Link2, TrendingUp, Download,
  Share2, MessageCircle, Eye, Send, ArrowRightLeft, UserPlus, X, FileDown,
} from "lucide-react";
import { formatPhone } from "@/lib/utils";
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
  enrolledReferrals: number;
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

interface RecentReferralActivity {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
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
  recentReferralActivities: RecentReferralActivity[];
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
  if (ref.status === "enrolled") return "enrolled";
  if (ref.status === "submitted") return "submitted";
  if (ref.status === "opened") return "opened";
  const daysSince = getDaysSince(ref.createdAt);
  if (ref.status === "pending") {
    if (daysSince > 30) return "not enrolled";
    return "pending";
  }
  if (ref.status === "not_enrolled" || ref.status === "cancelled") return "not enrolled";
  return ref.status;
}

const referralActivityIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  referral_submitted: { icon: <Send className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary" },
  referral_click: { icon: <Eye className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info" },
  status_changed: { icon: <ArrowRightLeft className="w-3.5 h-3.5" />, color: "bg-rx-warning-light text-rx-warning" },
  default: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: "bg-rx-gray-100 text-rx-gray-600" },
};

function getReferralActivityMeta(action: string) {
  for (const [key, val] of Object.entries(referralActivityIcons)) {
    if (action.includes(key) || key === action) return val;
  }
  return referralActivityIcons.default;
}

export function AffiliateDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { affiliate, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7D" | "30D" | "90D">("30D");

  // Add Referral modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [addResumeFile, setAddResumeFile] = useState<File | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

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
  const enrolledCount = data?.kpis.enrolledReferrals ?? 0;
  const conversionRatio = data?.kpis.conversionRate ?? '0';

  // Use real chart data from API
  const totalChartData = data?.totalReferralsChart || [];
  const enrolledChartData = data?.enrolledReferralsChart || [];
  const maxTotalVal = Math.max(...totalChartData.map((d) => d.value), 1);
  const maxEnrolledVal = Math.max(...enrolledChartData.map((d) => d.value), 1);

  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate?.referralCode || !token) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          referralCode: affiliate.referralCode,
          visitorName: addForm.name,
          visitorEmail: addForm.email,
          visitorPhone: addForm.phone || undefined,
          source: "direct",
          notes: addForm.notes || undefined,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Failed to add referral");
      if (addResumeFile && responseData.id) {
        const fd = new FormData();
        fd.append("file", addResumeFile);
        fd.append("referralId", responseData.id);
        await fetch("/api/upload/resume", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      setAddSuccess(true);
      setAddForm({ name: "", email: "", phone: "", notes: "" });
      setAddResumeFile(null);
      await fetchData();
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess(false);
      }, 1500);
    } catch (err: any) {
      setAddError(err.message || "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  };

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
  const shareOnInstagram = async () => {
    try { await navigator.clipboard.writeText(referralLink); alert("Referral link copied! Paste it into your Instagram bio, story, or DM."); } catch {}
    window.open("https://www.instagram.com/", "_blank");
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
              onClick={() => { setShowAddModal(true); setAddError(null); setAddSuccess(false); setAddForm({ name: "", email: "", phone: "", notes: "" }); setAddResumeFile(null); }}
              className="px-4 py-2.5 bg-white/20 border border-white/40 rounded-lg text-sm font-semibold hover:bg-white/30 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Referral
            </button>
            <button
              onClick={() => onNavigate?.("earnings")}
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
            label="Links Clicked"
            value={(data?.kpis.totalConversions ?? 0).toLocaleString()}
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
            onClick={shareOnInstagram}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E1306C] text-white rounded-lg text-sm font-semibold hover:bg-[#c02560] transition-colors"
          >
            <Share2 className="w-4 h-4" /> Instagram
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
                    period === p ? "border-rx-secondary text-rx-secondary bg-rx-secondary-light" : "border-rx-gray-200 text-rx-gray-600"
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
                      className="flex-1 bg-gradient-to-t from-rx-secondary to-rx-secondary/60 rounded-t-md hover:from-[#059669] hover:to-rx-secondary transition-all group relative"
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
                    period === p ? "border-rx-secondary text-rx-secondary bg-rx-secondary-light" : "border-rx-gray-200 text-rx-gray-600"
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
                link: <ExternalLink className="w-4 h-4" />,
                instagram: <Share2 className="w-4 h-4" />,
                linkedin: <Share2 className="w-4 h-4" />,
              };
              const colors: Record<string, string> = {
                social: "bg-rx-primary-light text-rx-primary",
                email: "bg-rx-secondary-light text-rx-secondary",
                website: "bg-rx-warning-light text-rx-warning",
                direct: "bg-rx-info-light text-rx-info",
                whatsapp: "bg-[#25D366]/15 text-[#25D366]",
                facebook: "bg-[#1877F2]/15 text-[#1877F2]",
                link: "bg-rx-primary-light text-rx-primary",
                instagram: "bg-[#E1306C]/15 text-[#E1306C]",
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

      {/* Recent Referral Activity */}
      <SectionCard title="Recent Referral Activity">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-9 h-9 bg-rx-gray-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-full bg-rx-gray-100 rounded mb-1" />
                  <div className="h-3 w-16 bg-rx-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : data?.recentReferralActivities && data.recentReferralActivities.length > 0 ? (
          <div className="space-y-4">
            {data.recentReferralActivities.map((a, i) => {
              const meta = getReferralActivityMeta(a.action);
              return (
                <div key={a.id} className={`flex gap-3 ${i < data.recentReferralActivities!.length - 1 ? "pb-4 border-b border-rx-gray-100" : ""}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                    {meta.icon}
                  </div>
                  <div>
                    <div className="text-sm text-rx-gray-700 leading-relaxed">{a.details || a.action}</div>
                    <div className="text-xs text-rx-gray-400 mt-1">{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No activity yet" description="Referral activity will appear here as actions occur" />
        )}
      </SectionCard>

      {/* Add Referral Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Add Referral</h3>
              <button onClick={() => setShowAddModal(false)} className="text-rx-gray-400 hover:text-rx-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addSuccess ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-rx-secondary-light flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-6 h-6 text-rx-secondary" />
                </div>
                <p className="text-sm font-semibold text-rx-gray-800">Referral added successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleAddReferral} className="space-y-4">
                {addError && (
                  <div className="p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {addError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
                    Full Name <span className="text-rx-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
                    Email <span className="text-rx-danger">*</span>
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
                    Phone <span className="text-rx-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: formatPhone(e.target.value) })}
                    required
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
                    Notes <span className="text-rx-gray-400 text-xs font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={addForm.notes}
                    onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all resize-y"
                    placeholder="Add any relevant context about this referral..."
                  />
                  <p className="text-xs text-rx-gray-400 mt-1">Visible to you and the admin team.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
                    Resume <span className="text-rx-gray-400 text-xs font-normal">(Optional — PDF or Word, max 5MB)</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setAddResumeFile(e.target.files?.[0] || null)}
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-rx-primary-light file:text-rx-primary"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50"
                  >Cancel</button>
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50"
                  >{addLoading ? "Adding..." : "Add Referral"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
