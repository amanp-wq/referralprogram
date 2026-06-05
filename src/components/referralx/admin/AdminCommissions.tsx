"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, ErrorWithRetry, EmptyState, TableSkeleton, formatCurrency, formatDate } from "../shared";
import { DollarSign, TrendingUp, Clock, AlertCircle, Download, CheckCircle, XCircle, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Commission {
  id: string;
  affiliateId: string;
  programId: string;
  referralId: string | null;
  amount: number;
  rate: number;
  type: string;
  status: string;
  payoutId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  Affiliate?: { id: string; referralCode: string; User?: { name: string; email: string } };
  Referral?: { id: string; visitorName: string | null; visitorEmail: string | null };
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

interface CommissionsResponse {
  commissions: Commission[];
  total: number;
  page: number;
  limit: number;
}

export function AdminCommissions() {
  const { token } = useAuth();
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/commissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load commissions");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        toast({ title: "Status updated", description: `Commission status changed to ${status}` });
        fetchData();
      }
    } catch {}
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const commissions = data?.commissions || [];
  const totalAmount = commissions.reduce((s, c) => s + c.amount, 0);
  const pendingAmount = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
  const approvedAmount = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);
  const releasedAmount = commissions.filter((c) => c.status === "released" || c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const failedAmount = commissions.filter((c) => c.status === "failed").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Commissions" value={formatCurrency(totalAmount)} iconColor="primary" icon={<DollarSign className="w-[18px] h-[18px]" />} />
            <KpiCard label="Pending" value={formatCurrency(pendingAmount)} iconColor="warning" icon={<Clock className="w-[18px] h-[18px]" />} />
            <KpiCard label="Approved" value={formatCurrency(approvedAmount)} iconColor="success" icon={<CheckCircle className="w-[18px] h-[18px]" />} />
            <KpiCard label="Released" value={formatCurrency(releasedAmount)} iconColor="info" icon={<Send className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

      {/* Commissions Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <div className="flex gap-1">
            {["", "pending", "approved", "released", "failed"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 text-sm font-medium rounded-lg ${statusFilter === s ? "bg-rx-primary-light text-rx-primary font-semibold" : "text-rx-gray-500 hover:bg-rx-gray-50"}`}>
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              const headers = ["Ambassador", "Referral", "Amount", "Rate", "Date", "Status"];
              const rows = commissions.map(c => [
                c.Affiliate?.User?.name || c.Affiliate?.referralCode || "Unknown",
                c.Referral?.visitorName || c.Referral?.visitorEmail || "-",
                c.amount.toString(),
                `${c.rate}%`,
                formatDate(c.createdAt),
                c.status,
              ]);
              downloadCSV("commissions.csv", headers, rows);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
          ><Download className="w-3 h-3" /> Export</button>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : commissions.length === 0 ? (
          <EmptyState title="No commissions found" description={statusFilter ? "Try adjusting your filter" : "Commissions will appear here once they are earned"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Ambassador</th>
                  <th className="px-5 py-3">Referral</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Rate</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => {
                  const affName = c.Affiliate?.User?.name || c.Affiliate?.referralCode || "Unknown";
                  const referralName = c.Referral?.visitorName || c.Referral?.visitorEmail || "-";
                  return (
                    <tr key={c.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                      <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-800">{affName}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700">{referralName}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(c.amount)}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-500">{c.rate}%</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(c.createdAt)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={c.status as any} /></td>
                      <td className="px-5 py-3.5">
                        {c.status === "pending" && (
                          <div className="flex gap-1">
                            <button onClick={() => handleStatusChange(c.id, "approved")} className="text-xs px-2 py-1 bg-rx-secondary-light text-rx-secondary rounded hover:bg-rx-secondary/20 font-medium">Approve</button>
                            <button onClick={() => handleStatusChange(c.id, "failed")} className="text-xs px-2 py-1 bg-rx-danger-light text-rx-danger rounded hover:bg-rx-danger/20 font-medium">Reject</button>
                          </div>
                        )}
                        {c.status === "approved" && (
                          <div className="flex gap-1">
                            <button onClick={() => handleStatusChange(c.id, "released")} className="text-xs px-2 py-1 bg-rx-info-light text-rx-info rounded hover:bg-rx-info/20 font-medium">Release</button>
                          </div>
                        )}
                      </td>
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
