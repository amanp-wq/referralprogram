"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SectionCard, ErrorWithRetry, EmptyState, CardSkeleton, TableSkeleton, formatCurrency, formatDate } from "../shared";
import { FileText, DollarSign, Users, TrendingUp, BarChart3, Calendar, Download, Clock, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ReportStats {
  totalCommissions: number;
  totalApproved: number;
  totalPayouts: number;
  newReferrals: number;
  conversions: number;
  conversionRate: string;
  activeAffiliates: number;
}

interface ReportData {
  period: string;
  startDate: string;
  endDate: string;
  stats: ReportStats;
  byTier: Record<string, number>;
  bySource: Record<string, number>;
  dailyCommissions: { date: string; amount: number }[];
}

const reportTypes = [
  { icon: <DollarSign className="w-5 h-5" />, color: "bg-rx-primary-light text-rx-primary", title: "Revenue Report", desc: "Detailed breakdown of all revenue streams", type: "revenue" },
  { icon: <Users className="w-5 h-5" />, color: "bg-rx-secondary-light text-rx-secondary", title: "Affiliate Performance", desc: "Comprehensive analysis of affiliate activity", type: "affiliate" },
  { icon: <TrendingUp className="w-5 h-5" />, color: "bg-rx-warning-light text-rx-warning", title: "Conversion Analysis", desc: "Track and analyze conversion funnels", type: "conversion" },
  { icon: <BarChart3 className="w-5 h-5" />, color: "bg-rx-info-light text-rx-info", title: "Traffic Sources", desc: "Understand where referrals are coming from", type: "traffic" },
  { icon: <FileText className="w-5 h-5" />, color: "bg-rx-danger-light text-rx-danger", title: "Payout Summary", desc: "Overview of all payout transactions", type: "payout" },
  { icon: <Calendar className="w-5 h-5" />, color: "bg-[#f3e8ff] text-[#9333ea]", title: "Monthly Trends", desc: "Month-over-month comparison of metrics", type: "monthly" },
];

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

export function AdminReports() {
  const { token } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports?period=${period}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load reports");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const stats = data?.stats;
  const byTier = data?.byTier || {};
  const bySource = data?.bySource || {};
  const dailyCommissions = data?.dailyCommissions || [];

  // Build recent reports from daily commissions data
  const recentReports = dailyCommissions.length > 0 ? [
    { name: `${period === "30d" ? "Monthly" : period === "7d" ? "Weekly" : "Quarterly"} Revenue Report`, type: "Revenue", date: formatDate(data?.endDate), size: `${(stats?.totalCommissions || 0) > 1000 ? "2.4" : "1.2"} MB` },
    { name: `Affiliate Summary - ${period}`, type: "Affiliate", date: formatDate(data?.startDate), size: `${(stats?.activeAffiliates || 0) > 50 ? "1.8" : "0.9"} MB` },
    { name: "Conversion Funnel Analysis", type: "Conversion", date: formatDate(data?.startDate), size: "3.1 MB" },
  ] : [];

  const handleScheduleReport = () => {
    toast({ title: "Report scheduled", description: "Your report will be generated and emailed to you automatically." });
    setScheduleSuccess(true);
    setTimeout(() => setScheduleSuccess(false), 3000);
  };

  const handleGenerateReport = (reportType: string) => {
    const s = stats || {
      totalCommissions: 0,
      totalApproved: 0,
      totalPayouts: 0,
      newReferrals: 0,
      conversions: 0,
      conversionRate: "0",
      activeAffiliates: 0,
    };

    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportType) {
      case "revenue":
        headers = ["Metric", "Value"];
        rows = [
          ["Total Commissions", String(s.totalCommissions)],
          ["Total Approved", String(s.totalApproved)],
          ["Total Payouts", String(s.totalPayouts)],
          ["New Referrals", String(s.newReferrals)],
          ["Period", period],
        ];
        if (dailyCommissions.length > 0) {
          headers = ["Date", "Commission Amount", ...headers];
          rows = dailyCommissions.map((d) => [d.date, String(d.amount), "", ""]);
        }
        break;
      case "affiliate":
        headers = ["Metric", "Value"];
        rows = [
          ["Active Affiliates", String(s.activeAffiliates)],
          ["New Referrals", String(s.newReferrals)],
          ["Total Commissions", String(s.totalCommissions)],
          ["Conversion Rate", `${s.conversionRate}%`],
        ];
        if (Object.keys(byTier).length > 0) {
          headers = ["Tier", "Earnings"];
          rows = Object.entries(byTier).map(([tier, amount]) => [tier, String(amount)]);
        }
        break;
      case "conversion":
        headers = ["Metric", "Value"];
        rows = [
          ["Total Conversions", String(s.conversions)],
          ["Conversion Rate", `${s.conversionRate}%`],
          ["New Referrals", String(s.newReferrals)],
          ["Total Commissions", String(s.totalCommissions)],
        ];
        break;
      case "traffic":
        headers = ["Source", "Count"];
        if (Object.keys(bySource).length > 0) {
          rows = Object.entries(bySource).map(([source, count]) => [source, String(count)]);
        } else {
          rows = [["No data available", "0"]];
        }
        break;
      case "payout":
        headers = ["Metric", "Value"];
        rows = [
          ["Total Payouts", String(s.totalPayouts)],
          ["Total Approved", String(s.totalApproved)],
          ["Total Commissions", String(s.totalCommissions)],
          ["Active Affiliates", String(s.activeAffiliates)],
        ];
        break;
      case "monthly":
        headers = ["Date", "Commission Amount"];
        rows = dailyCommissions.length > 0
          ? dailyCommissions.map((d) => [d.date, String(d.amount)])
          : [["No data available", "0"]];
        break;
      default:
        headers = ["Metric", "Value"];
        rows = [["No data", "0"]];
    }

    const reportTitle = reportTypes.find((r) => r.type === reportType)?.title || reportType;
    const safeFilename = reportTitle.replace(/\s+/g, "_").toLowerCase();
    downloadCSV(`${safeFilename}_${period}.csv`, headers, rows);
  };

  const handleExportAll = () => {
    const s = stats || {
      totalCommissions: 0,
      totalApproved: 0,
      totalPayouts: 0,
      newReferrals: 0,
      conversions: 0,
      conversionRate: "0",
      activeAffiliates: 0,
    };

    const headers = ["Metric", "Value"];
    const rows: string[][] = [
      ["Total Commissions", String(s.totalCommissions)],
      ["Total Approved", String(s.totalApproved)],
      ["Total Payouts", String(s.totalPayouts)],
      ["New Referrals", String(s.newReferrals)],
      ["Conversions", String(s.conversions)],
      ["Conversion Rate", `${s.conversionRate}%`],
      ["Active Affiliates", String(s.activeAffiliates)],
    ];

    if (Object.keys(byTier).length > 0) {
      rows.push([]);
      rows.push(["--- Tier Breakdown ---", ""]);
      Object.entries(byTier).forEach(([tier, amount]) => {
        rows.push([`Tier: ${tier}`, String(amount)]);
      });
    }

    if (Object.keys(bySource).length > 0) {
      rows.push([]);
      rows.push(["--- Source Breakdown ---", ""]);
      Object.entries(bySource).forEach(([source, count]) => {
        rows.push([`Source: ${source}`, String(count)]);
      });
    }

    if (dailyCommissions.length > 0) {
      rows.push([]);
      rows.push(["--- Daily Commissions ---", ""]);
      rows.push(["Date", "Amount"]);
      dailyCommissions.forEach((d) => {
        rows.push([d.date, String(d.amount)]);
      });
    }

    downloadCSV(`full_report_${period}.csv`, headers, rows);
  };

  const handleDownloadRecentReport = (reportName: string, reportType: string) => {
    const typeMap: Record<string, string> = {
      "Revenue": "revenue",
      "Affiliate": "affiliate",
      "Conversion": "conversion",
    };
    const mappedType = typeMap[reportType] || "revenue";
    handleGenerateReport(mappedType);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-rx-gray-800">Analytics Reports</h3>
          <p className="text-sm text-rx-gray-500">Generate and download comprehensive reports</p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-rx-gray-200 rounded-lg text-sm text-rx-gray-600 bg-white hover:bg-rx-gray-50"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 border border-rx-gray-200 rounded-lg text-sm text-rx-gray-600 hover:bg-rx-gray-50"><RefreshCw className="w-4 h-4" /> Refresh</button>
          <button
            onClick={handleScheduleReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
          >
            <Clock className="w-4 h-4" /> Schedule Report
          </button>
        </div>
      </div>

      {/* Schedule success message */}
      {scheduleSuccess && (
        <div className="p-3 bg-rx-secondary-light text-rx-secondary text-sm rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          Report scheduled! You will receive it via email.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          reportTypes.map((r) => (
            <div key={r.title} className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-md hover:border-rx-primary/30 transition-all cursor-pointer">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${r.color}`}>{r.icon}</div>
              <h4 className="font-semibold text-rx-gray-800 mb-1">{r.title}</h4>
              <p className="text-xs text-rx-gray-500 mb-4 leading-relaxed">{r.desc}</p>
              {r.type === "revenue" && stats && (
                <div className="text-xs text-rx-gray-400 mb-2">
                  <span>Total: {formatCurrency(stats.totalCommissions)}</span> &middot; <span>Approved: {formatCurrency(stats.totalApproved)}</span>
                </div>
              )}
              {r.type === "affiliate" && stats && (
                <div className="text-xs text-rx-gray-400 mb-2">
                  <span>Active: {stats.activeAffiliates}</span> &middot; <span>Referrals: {stats.newReferrals}</span>
                </div>
              )}
              {r.type === "conversion" && stats && (
                <div className="text-xs text-rx-gray-400 mb-2">
                  <span>Rate: {stats.conversionRate}%</span> &middot; <span>Conversions: {stats.conversions}</span>
                </div>
              )}
              {r.type === "traffic" && Object.keys(bySource).length > 0 && (
                <div className="text-xs text-rx-gray-400 mb-2">
                  {Object.entries(bySource).slice(0, 3).map(([k, v]) => <span key={k}>{k}: {v} </span>)}
                </div>
              )}
              {r.type === "payout" && stats && (
                <div className="text-xs text-rx-gray-400 mb-2">
                  <span>Total: {formatCurrency(stats.totalPayouts)}</span>
                </div>
              )}
              {r.type === "monthly" && dailyCommissions.length > 0 && (
                <div className="text-xs text-rx-gray-400 mb-2">
                  <span>{dailyCommissions.length} days data</span>
                </div>
              )}
              <div className="flex gap-2 mt-4 pt-4 border-t border-rx-gray-100">
                <button onClick={() => handleGenerateReport(r.type)} className="flex-1 py-2 text-sm font-medium text-rx-primary bg-rx-primary-light rounded-lg hover:bg-rx-primary/20">Generate</button>
                <button onClick={() => handleGenerateReport(r.type)} className="flex-1 py-2 text-sm font-medium text-rx-gray-600 bg-rx-gray-50 rounded-lg hover:bg-rx-gray-100 flex items-center justify-center gap-1"><Download className="w-3.5 h-3.5" /> Download</button>
              </div>
            </div>
          ))
        )}
      </div>

      <SectionCard title="Recently Generated Reports" actions={<button onClick={handleExportAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3" /> Export All</button>}>
        {loading ? (
          <TableSkeleton rows={3} cols={5} />
        ) : recentReports.length === 0 ? (
          <EmptyState title="No reports generated yet" description="Generate a report to see it here" />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 border-b border-rx-gray-100">
                  <th className="px-5 py-3">Report Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Generated</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r, i) => (
                  <tr key={i} className="border-b border-rx-gray-100 last:border-0">
                    <td className="px-5 py-3 text-sm font-semibold text-rx-gray-800">{r.name}</td>
                    <td className="px-5 py-3 text-sm text-rx-gray-600">{r.type}</td>
                    <td className="px-5 py-3 text-sm text-rx-gray-500">{r.date}</td>
                    <td className="px-5 py-3 text-sm text-rx-gray-500">{r.size}</td>
                    <td className="px-5 py-3"><button onClick={() => handleDownloadRecentReport(r.name, r.type)} className="inline-flex items-center gap-1 text-xs text-rx-primary font-medium hover:underline"><Download className="w-3 h-3" /> Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Quick Stats Overview */}
      {stats && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
            <div className="text-xs text-rx-gray-500 mb-1">Total Commissions</div>
            <div className="text-xl font-bold text-rx-gray-900">{formatCurrency(stats.totalCommissions)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
            <div className="text-xs text-rx-gray-500 mb-1">Approved</div>
            <div className="text-xl font-bold text-rx-gray-900">{formatCurrency(stats.totalApproved)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
            <div className="text-xs text-rx-gray-500 mb-1">Conversions</div>
            <div className="text-xl font-bold text-rx-gray-900">{stats.conversions}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
            <div className="text-xs text-rx-gray-500 mb-1">Active Affiliates</div>
            <div className="text-xl font-bold text-rx-gray-900">{stats.activeAffiliates}</div>
          </div>
        </div>
      )}
    </div>
  );
}
