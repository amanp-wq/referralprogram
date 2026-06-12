"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, ErrorWithRetry, EmptyState, TableSkeleton, formatCurrency, formatDate } from "../shared";
import { DollarSign, TrendingUp, Clock, AlertCircle, Download, CheckCircle, XCircle, Send, Eye, Pencil, X, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ReferralDetail {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone?: string | null;
  source: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

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

  // Referral detail modal state
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralDetail | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ visitorName: "", visitorEmail: "", visitorPhone: "", status: "" });
  const [savingReferral, setSavingReferral] = useState(false);

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

  const handleViewReferral = async (referralId: string | null) => {
    if (!referralId) {
      toast({ title: "No referral", description: "This commission has no linked referral", variant: "destructive" });
      return;
    }
    setReferralLoading(true);
    setShowReferralModal(true);
    setEditMode(false);
    try {
      const res = await fetch(`/api/admin/referrals/${referralId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load referral");
      const referral = await res.json();
      setSelectedReferral(referral);
      setEditForm({
        visitorName: referral.visitorName || "",
        visitorEmail: referral.visitorEmail || "",
        visitorPhone: referral.visitorPhone || "",
        status: referral.status || "",
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load referral", variant: "destructive" });
      setShowReferralModal(false);
    } finally {
      setReferralLoading(false);
    }
  };

  const handleSaveReferral = async () => {
    if (!selectedReferral) return;
    setSavingReferral(true);
    try {
      const res = await fetch(`/api/admin/referrals/${selectedReferral.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed to update referral");
      toast({ title: "Referral updated", description: "Referral details have been saved" });
      setSelectedReferral({ ...selectedReferral, ...editForm });
      setEditMode(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingReferral(false);
    }
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
          <TableSkeleton rows={5} cols={7} />
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
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-rx-gray-700">{referralName}</span>
                          {c.referralId && (
                            <button
                              onClick={() => handleViewReferral(c.referralId)}
                              className="text-rx-primary hover:text-rx-primary-dark transition-colors"
                              title="View & Edit Referral"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
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

      {/* Referral Detail / Edit Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">
                {editMode ? "Edit Referral" : "Referral Details"}
              </h3>
              <div className="flex items-center gap-2">
                {!editMode && selectedReferral && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rx-primary-light text-rx-primary rounded-lg text-xs font-semibold hover:bg-rx-primary/20 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
                <button onClick={() => { setShowReferralModal(false); setEditMode(false); }} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
              </div>
            </div>

            {referralLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-rx-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedReferral ? (
              <div className="space-y-4">
                {editMode ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Visitor Name</label>
                      <input
                        type="text"
                        value={editForm.visitorName}
                        onChange={(e) => setEditForm({ ...editForm, visitorName: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Visitor Email</label>
                      <input
                        type="email"
                        value={editForm.visitorEmail}
                        onChange={(e) => setEditForm({ ...editForm, visitorEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Visitor Phone</label>
                      <input
                        type="tel"
                        value={editForm.visitorPhone}
                        onChange={(e) => setEditForm({ ...editForm, visitorPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                      >
                        <option value="clicked">Clicked</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending">Pending</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="converted">Converted</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveReferral}
                        disabled={savingReferral}
                        className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> {savingReferral ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-rx-gray-50 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-rx-gray-500 font-medium">Name</span>
                        <span className="text-sm text-rx-gray-800 font-semibold">{selectedReferral.visitorName || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-rx-gray-500 font-medium">Email</span>
                        <span className="text-sm text-rx-gray-800">{selectedReferral.visitorEmail || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-rx-gray-500 font-medium">Phone</span>
                        <span className="text-sm text-rx-gray-800">{selectedReferral.visitorPhone || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-rx-gray-500 font-medium">Source</span>
                        <span className="text-sm text-rx-gray-800 capitalize">{selectedReferral.source || "direct"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-rx-gray-500 font-medium">Status</span>
                        <StatusBadge status={selectedReferral.status as any} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-rx-gray-500 font-medium">Created</span>
                        <span className="text-sm text-rx-gray-800">{formatDate(selectedReferral.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-rx-gray-500 font-medium">Updated</span>
                        <span className="text-sm text-rx-gray-800">{formatDate(selectedReferral.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={() => setShowReferralModal(false)}
                        className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-rx-gray-500 text-sm">No referral data found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
