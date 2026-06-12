"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge, Avatar, getInitials } from "../shared";
import {
  Users, UserCheck, Clock, UserX, Download, RefreshCw, AlertCircle, ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface Referral {
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDaysSince(dateStr: string): number {
  const now = new Date();
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getReferralStatus(ref: Referral): string {
  if (ref.status === "completed" || ref.status === "converted" || ref.status === "enrolled") return "enrolled";
  if (ref.status === "submitted") return "submitted";
  // "clicked" / "opened" = link was clicked but form not yet submitted = "opened"
  if (ref.status === "clicked" || ref.status === "opened") return "opened";
  const daysSince = getDaysSince(ref.createdAt);
  if (ref.status === "pending") {
    if (daysSince > 30) return "not enrolled";
    return "pending";
  }
  if (ref.status === "inactive" || ref.status === "cancelled" || ref.status === "failed" || ref.status === "not_enrolled") {
    return "not enrolled";
  }
  // Default: time-based
  if (daysSince > 30) return "not enrolled";
  if (daysSince <= 30) return "pending";
  return ref.status;
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

type FilterTab = "All" | "Opened" | "Submitted" | "Pending" | "Enrolled" | "Not Enrolled";

export function AffiliateReferrals() {
  const { token } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");

  const fetchReferrals = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/referrals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load referrals");
      }
      const json = await res.json();
      setReferrals(json.referrals || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Compute statuses for each referral
  const referralsWithStatus = referrals.map((r) => ({
    ...r,
    computedStatus: getReferralStatus(r),
    daysSince: getDaysSince(r.createdAt),
  }));

  const totalReferrals = referralsWithStatus.length;
  const openedCount = referralsWithStatus.filter((r) => r.computedStatus === "opened").length;
  const submittedCount = referralsWithStatus.filter((r) => r.computedStatus === "submitted").length;
  const enrolledCount = referralsWithStatus.filter((r) => r.computedStatus === "enrolled").length;
  const pendingCount = referralsWithStatus.filter((r) => r.computedStatus === "pending").length;
  const notEnrolledCount = referralsWithStatus.filter((r) => r.computedStatus === "not enrolled").length;

  // Filter referrals based on active tab
  const filteredReferrals = activeFilter === "All"
    ? referralsWithStatus
    : referralsWithStatus.filter((r) => {
        if (activeFilter === "Opened") return r.computedStatus === "opened";
        if (activeFilter === "Submitted") return r.computedStatus === "submitted";
        if (activeFilter === "Pending") return r.computedStatus === "pending";
        if (activeFilter === "Enrolled") return r.computedStatus === "enrolled";
        if (activeFilter === "Not Enrolled") return r.computedStatus === "not enrolled";
        return true;
      });

  const handleExportCSV = () => {
    const headers = ["Referred Person", "Source", "Date", "Days Since", "Status"];
    const rows = filteredReferrals.map((r) => [
      r.visitorName || r.visitorEmail || "Anonymous",
      r.source || "direct",
      formatDate(r.createdAt),
      r.daysSince.toString(),
      r.computedStatus,
    ]);
    downloadCSV("referrals.csv", headers, rows);
    toast({ title: "Export complete", description: "Referrals CSV downloaded successfully" });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load referrals</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchReferrals} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
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
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
          <KpiCard
            label="Total Referrals"
            value={totalReferrals.toLocaleString()}
            iconColor="primary"
            icon={<Users className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Opened"
            value={openedCount.toLocaleString()}
            iconColor="info"
            icon={<ExternalLink className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Enrolled"
            value={enrolledCount.toLocaleString()}
            iconColor="success"
            icon={<UserCheck className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Pending"
            value={pendingCount.toLocaleString()}
            iconColor="warning"
            icon={<Clock className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Not Enrolled"
            value={notEnrolledCount.toLocaleString()}
            iconColor="danger"
            icon={<UserX className="w-[18px] h-[18px]" />}
          />
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <div className="flex gap-1 overflow-x-auto">
            {(["All", "Opened", "Submitted", "Pending", "Enrolled", "Not Enrolled"] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap ${
                  activeFilter === tab
                    ? "bg-rx-primary-light text-rx-primary font-semibold"
                    : "text-rx-gray-500 hover:bg-rx-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchReferrals}
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
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredReferrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Referred Person</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Days Since</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((r) => {
                  const displayName = r.visitorName || r.visitorEmail || "Anonymous";
                  const initials = getInitials(displayName);
                  return (
                    <tr key={r.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} />
                          <div>
                            <div className="text-sm font-semibold text-rx-gray-800">{displayName}</div>
                            {r.visitorEmail && <div className="text-xs text-rx-gray-500">{r.visitorEmail}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700 capitalize">{r.source || "direct"}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(r.createdAt)}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-500">{r.daysSince}d</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.computedStatus as any} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
            <p className="text-sm text-rx-gray-500">
              {activeFilter === "All"
                ? "No referrals yet. Share your link to start building your network!"
                : `No ${activeFilter.toLowerCase()} referrals found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
