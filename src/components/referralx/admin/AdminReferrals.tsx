"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, ErrorWithRetry, EmptyState, TableSkeleton, formatDate, getInitials } from "../shared";
import { Share2, UserPlus, RefreshCw, ArrowRight, Download, Clock, UserCheck, UserX } from "lucide-react";

interface Referral {
  id: string;
  affiliateId: string;
  programId: string;
  linkId: string | null;
  referralCode: string;
  visitorEmail: string | null;
  visitorName: string | null;
  visitorIp: string | null;
  source: string | null;
  status: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  Affiliate?: { id: string; referralCode: string; User?: { name: string; email: string } };
  Program?: { id: string; name: string; slug: string };
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

function getReferralStatus(r: Referral): { status: string; label: string } {
  // "clicked" status should never appear in referrals — it's tracking data only
  // But just in case it slips through, treat it as not a real referral
  if (r.status === "clicked") {
    return { status: "clicked", label: "Link Open" };
  }
  if (r.status === "enrolled" || r.status === "converted" || r.status === "completed") {
    return { status: "enrolled", label: "Enrolled" };
  }
  if (r.status === "submitted") {
    return { status: "submitted", label: "Submitted" };
  }
  // "pending" status = form submitted but not yet enrolled
  if (r.status === "pending") {
    const createdAt = new Date(r.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      return { status: "not_enrolled", label: "Not Enrolled" };
    }
    return { status: "pending", label: "Pending" };
  }
  // Fallback: time-based
  const createdAt = new Date(r.createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) {
    return { status: "not_enrolled", label: "Not Enrolled" };
  }
  return { status: "pending", label: "Pending" };
}

function getDaysSinceReferral(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

interface ReferralsResponse {
  referrals: Referral[];
  total: number;
  page: number;
  limit: number;
}

export function AdminReferrals() {
  const { token } = useAuth();
  const [data, setData] = useState<ReferralsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/referrals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load referrals");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const referrals = data?.referrals || [];
  const total = data?.total || 0;

  // Compute status counts using new logic (exclude "clicked" — those are tracking, not referrals)
  const realReferrals = referrals.filter(r => r.status !== "clicked");
  const submittedCount = realReferrals.filter(r => getReferralStatus(r).status === "submitted").length;
  const enrolledCount = realReferrals.filter(r => getReferralStatus(r).status === "enrolled").length;
  const pendingCount = realReferrals.filter(r => getReferralStatus(r).status === "pending").length;
  const notEnrolledCount = realReferrals.filter(r => getReferralStatus(r).status === "not_enrolled").length;

  // Filter referrals based on status filter (exclude clicked from display)
  const filteredReferrals = statusFilter === ""
    ? realReferrals
    : realReferrals.filter(r => getReferralStatus(r).status === statusFilter);

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Referrals" value={realReferrals.length.toLocaleString()} iconColor="primary" icon={<Share2 className="w-[18px] h-[18px]" />} />
            <KpiCard label="Enrolled" value={enrolledCount.toLocaleString()} iconColor="success" icon={<UserCheck className="w-[18px] h-[18px]" />} />
            <KpiCard label="Pending" value={pendingCount.toLocaleString()} iconColor="warning" icon={<Clock className="w-[18px] h-[18px]" />} />
            <KpiCard label="Not Enrolled" value={notEnrolledCount.toLocaleString()} iconColor="danger" icon={<UserX className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

      {/* Referral List Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Referral List</h3>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 bg-white hover:bg-rx-gray-50"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="enrolled">Enrolled</option>
              <option value="not_enrolled">Not Enrolled</option>
            </select>
            <button
              onClick={() => {
                const headers = ["Ambassador", "Referred Person", "Source", "Days Since Referral", "Status"];
                const rows = referrals.map(r => {
                  const statusInfo = getReferralStatus(r);
                  return [
                    r.Affiliate?.User?.name || r.referralCode || "Unknown",
                    r.visitorName || r.visitorEmail || "-",
                    r.source || "direct",
                    String(getDaysSinceReferral(r.createdAt)),
                    statusInfo.label,
                  ];
                });
                downloadCSV("referrals.csv", headers, rows);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            ><Download className="w-3 h-3" /> Export</button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filteredReferrals.length === 0 ? (
          <EmptyState title="No referrals found" description={statusFilter ? "Try adjusting your filter" : "Referrals will appear here once they start coming in"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Ambassador</th>
                  <th className="px-5 py-3">Referred</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Days Since Referral</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((r) => {
                  const affName = r.Affiliate?.User?.name || r.referralCode || "Unknown";
                  const affEmail = r.Affiliate?.User?.email || "";
                  const initials = getInitials(affName);
                  const visitorName = r.visitorName || r.visitorEmail || "-";
                  const statusInfo = getReferralStatus(r);
                  const daysSince = getDaysSinceReferral(r.createdAt);
                  return (
                    <tr key={r.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} />
                          <div>
                            <div className="text-sm font-semibold text-rx-gray-800">{affName}</div>
                            <div className="text-xs text-rx-gray-500">{affEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-rx-gray-700">{visitorName}</div>
                        {r.visitorEmail && r.visitorEmail !== visitorName && <div className="text-xs text-rx-gray-500">{r.visitorEmail}</div>}
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs bg-rx-gray-100 text-rx-gray-600 px-2 py-0.5 rounded capitalize">{r.source || "direct"}</span></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-rx-gray-700">{daysSince}</span>
                          <span className="text-xs text-rx-gray-400">days</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={statusInfo.status as any} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
