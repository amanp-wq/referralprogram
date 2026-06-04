"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, ErrorWithRetry, EmptyState, TableSkeleton, formatDate, getInitials } from "../shared";
import { Share2, UserPlus, RefreshCw, ArrowRight, Filter, Download } from "lucide-react";

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
  const converted = referrals.filter((r) => r.status === "converted" || r.status === "active").length;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Referrals" value={total.toLocaleString()} iconColor="primary" icon={<Share2 className="w-[18px] h-[18px]" />} />
            <KpiCard label="Converted" value={converted.toLocaleString()} iconColor="success" icon={<UserPlus className="w-[18px] h-[18px]" />} />
            <KpiCard label="Conversion Rate" value={`${conversionRate}%`} iconColor="warning" icon={<RefreshCw className="w-[18px] h-[18px]" />} />
            <KpiCard label="Pending" value={referrals.filter((r) => r.status === "pending").length.toLocaleString()} iconColor="danger" icon={<ArrowRight className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

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
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="converted">Converted</option>
              <option value="inactive">Inactive</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3" /> Filter</button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3" /> Export</button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : referrals.length === 0 ? (
          <EmptyState title="No referrals found" description={statusFilter ? "Try adjusting your filter" : "Referrals will appear here once they start coming in"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Affiliate</th>
                  <th className="px-5 py-3">Referred</th>
                  <th className="px-5 py-3">Program</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => {
                  const affName = r.Affiliate?.User?.name || r.referralCode || "Unknown";
                  const affEmail = r.Affiliate?.User?.email || "";
                  const initials = getInitials(affName);
                  const programName = r.Program?.name || "-";
                  const visitorName = r.visitorName || r.visitorEmail || "-";
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
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700">{programName}</td>
                      <td className="px-5 py-3.5"><span className="text-xs bg-rx-gray-100 text-rx-gray-600 px-2 py-0.5 rounded capitalize">{r.source || "direct"}</span></td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(r.createdAt)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status as any} /></td>
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
