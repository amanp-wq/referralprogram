"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, ErrorWithRetry, EmptyState, TableSkeleton, formatCurrency, formatDate, getInitials } from "../shared";
import { Wallet, CheckCircle, Clock, XCircle, Download, Eye, Check, X } from "lucide-react";

interface Payout {
  id: string;
  affiliateId: string;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  notes: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  Affiliate?: { id: string; referralCode: string; payoutMethod: string; User?: { name: string; email: string } };
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

interface PayoutsResponse {
  payouts: Payout[];
  total: number;
  page: number;
  limit: number;
}

export function AdminPayouts() {
  const { token } = useAuth();
  const [data, setData] = useState<PayoutsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/payouts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load payouts");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  const handleApprove = async (payoutId: string) => {
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: payoutId, status: "completed" }),
      });
      if (res.ok) fetchData();
    } catch {}
  };

  const handleReject = async (payoutId: string) => {
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: payoutId, status: "failed" }),
      });
      if (res.ok) fetchData();
    } catch {}
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const payouts = data?.payouts || [];
  const totalAmount = payouts.reduce((s, p) => s + p.amount, 0);
  const completedAmount = payouts.filter((p) => p.status === "completed" || p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const failedAmount = payouts.filter((p) => p.status === "failed").reduce((s, p) => s + p.amount, 0);
  const pendingCount = payouts.filter((p) => p.status === "pending").length;
  const avgPayout = payouts.length > 0 ? totalAmount / payouts.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Payouts" value={formatCurrency(totalAmount)} iconColor="primary" icon={<Wallet className="w-[18px] h-[18px]" />} />
            <KpiCard label="Completed" value={formatCurrency(completedAmount)} iconColor="success" icon={<CheckCircle className="w-[18px] h-[18px]" />} />
            <KpiCard label="Pending" value={formatCurrency(pendingAmount)} iconColor="warning" icon={<Clock className="w-[18px] h-[18px]" />} />
            <KpiCard label="Failed" value={formatCurrency(failedAmount)} iconColor="danger" icon={<XCircle className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white rounded-2xl p-6 border border-rx-gray-200 animate-pulse"><div className="h-4 w-28 bg-rx-gray-200 rounded mb-2" /><div className="h-8 w-32 bg-rx-gray-200 rounded mb-1" /><div className="h-3 w-24 bg-rx-gray-100 rounded" /></div>)
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-md transition-shadow">
              <div className="text-xs text-rx-gray-500 font-medium mb-1">Pending Requests</div>
              <div className="text-2xl font-bold text-rx-gray-900 mb-1">{pendingCount}</div>
              <div className="text-xs text-rx-gray-400">{formatCurrency(pendingAmount)} total</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-md transition-shadow">
              <div className="text-xs text-rx-gray-500 font-medium mb-1">Average Payout</div>
              <div className="text-2xl font-bold text-rx-gray-900 mb-1">{formatCurrency(avgPayout)}</div>
              <div className="text-xs text-rx-gray-400">Per affiliate</div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-md transition-shadow">
              <div className="text-xs text-rx-gray-500 font-medium mb-1">Total Processed</div>
              <div className="text-2xl font-bold text-rx-gray-900 mb-1">{payouts.filter((p) => p.status === "completed" || p.status === "paid").length}</div>
              <div className="text-xs text-rx-gray-400">Payouts completed</div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Payout History</h3>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 bg-white hover:bg-rx-gray-50"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={() => {
                const headers = ["Affiliate", "Amount", "Method", "Requested Date", "Processed Date", "Status"];
                const rows = payouts.map(p => [
                  p.Affiliate?.User?.name || p.Affiliate?.referralCode || "Unknown",
                  p.amount.toString(),
                  p.method || "-",
                  formatDate(p.createdAt),
                  p.processedAt ? formatDate(p.processedAt) : "-",
                  p.status,
                ]);
                downloadCSV("payouts.csv", headers, rows);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            ><Download className="w-3 h-3" /> Export</button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : payouts.length === 0 ? (
          <EmptyState title="No payouts found" description={statusFilter ? "Try adjusting your filter" : "Payouts will appear here once requested"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Affiliate</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Requested</th>
                  <th className="px-5 py-3">Processed</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const affName = p.Affiliate?.User?.name || p.Affiliate?.referralCode || "Unknown";
                  const initials = getInitials(affName);
                  return (
                    <tr key={p.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} />
                          <span className="text-sm font-semibold text-rx-gray-800">{affName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700 capitalize">{p.method || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(p.createdAt)}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(p.processedAt)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status as any} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          {p.status === "pending" && (
                            <>
                              <button onClick={() => handleApprove(p.id)} className="p-1.5 rounded-lg hover:bg-rx-secondary-light text-rx-secondary" title="Approve"><Check className="w-4 h-4" /></button>
                              <button onClick={() => handleReject(p.id)} className="p-1.5 rounded-lg hover:bg-rx-danger-light text-rx-danger" title="Reject"><X className="w-4 h-4" /></button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedPayout(p);
                              setShowPayoutDialog(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-rx-gray-100 text-rx-gray-400"
                            title="View"
                          ><Eye className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Details Dialog */}
      {showPayoutDialog && selectedPayout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Payout Details</h3>
              <button onClick={() => { setShowPayoutDialog(false); setSelectedPayout(null); }} className="w-8 h-8 rounded-lg hover:bg-rx-gray-100 flex items-center justify-center text-rx-gray-500">&times;</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Affiliate</span>
                <span className="text-sm font-semibold text-rx-gray-800">{selectedPayout.Affiliate?.User?.name || selectedPayout.Affiliate?.referralCode || "Unknown"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Amount</span>
                <span className="text-sm font-semibold text-rx-gray-800">{formatCurrency(selectedPayout.amount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Method</span>
                <span className="text-sm text-rx-gray-700 capitalize">{selectedPayout.method || "-"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Reference</span>
                <span className="text-sm text-rx-gray-700 font-mono">{selectedPayout.reference || "-"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Notes</span>
                <span className="text-sm text-rx-gray-700">{selectedPayout.notes || "-"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Status</span>
                <StatusBadge status={selectedPayout.status as any} />
              </div>
              <div className="flex justify-between py-2 border-b border-rx-gray-100">
                <span className="text-sm text-rx-gray-500">Requested Date</span>
                <span className="text-sm text-rx-gray-700">{formatDate(selectedPayout.createdAt)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-rx-gray-500">Processed Date</span>
                <span className="text-sm text-rx-gray-700">{selectedPayout.processedAt ? formatDate(selectedPayout.processedAt) : "-"}</span>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => { setShowPayoutDialog(false); setSelectedPayout(null); }} className="w-full py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
