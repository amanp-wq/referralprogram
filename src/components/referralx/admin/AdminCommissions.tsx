"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, ErrorWithRetry, EmptyState, TableSkeleton, formatCurrency, formatDate } from "../shared";
import { DollarSign, TrendingUp, Clock, AlertCircle, Download, CheckCircle, XCircle, Send, Eye, Pencil, X, Save, Plus, Gift, Info, User, Mail, Phone, ArrowRight } from "lucide-react";
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
  Referral?: { id: string; visitorName: string | null; visitorEmail: string | null; visitorPhone?: string | null; status: string; createdAt: string };
}

interface AffiliateOption {
  id: string;
  referralCode: string;
  User?: { name: string; email: string } | null;
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

  // Add Commission modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);
  const [addForm, setAddForm] = useState({ affiliateId: "", amount: "", rate: "0", description: "", referralId: "" });
  const [submitting, setSubmitting] = useState(false);

  // Edit Commission modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [editCommissionForm, setEditCommissionForm] = useState({ amount: "", rate: "", description: "", type: "" });
  const [savingCommission, setSavingCommission] = useState(false);

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

  const fetchAffiliates = useCallback(async () => {
    setAffiliatesLoading(true);
    try {
      const res = await fetch("/api/admin/affiliates?limit=100", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to load affiliates");
      const json = await res.json();
      setAffiliates(json.affiliates || []);
    } catch {
      toast({ title: "Error", description: "Failed to load ambassadors", variant: "destructive" });
    } finally {
      setAffiliatesLoading(false);
    }
  }, [token]);

  const handleOpenAddModal = () => {
    setAddForm({ affiliateId: "", amount: "", rate: "0", description: "", referralId: "" });
    setShowAddModal(true);
    fetchAffiliates();
  };

  const handleSubmitCommission = async () => {
    if (!addForm.affiliateId) {
      toast({ title: "Validation Error", description: "Please select an ambassador", variant: "destructive" });
      return;
    }
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount greater than 0", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId: addForm.affiliateId,
          amount: parseFloat(addForm.amount),
          rate: parseFloat(addForm.rate) || 0,
          description: addForm.description || undefined,
          referralId: addForm.referralId || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create commission");
      }
      toast({ title: "Commission Created", description: "The commission has been successfully created" });
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create commission", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleOpenEditModal = (commission: Commission) => {
    setEditingCommission(commission);
    setEditCommissionForm({
      amount: commission.amount.toString(),
      rate: commission.rate.toString(),
      description: commission.description || "",
      type: commission.type || "commission",
    });
    setShowEditModal(true);
  };

  const handleSaveCommission = async () => {
    if (!editingCommission) return;
    if (!editCommissionForm.amount || parseFloat(editCommissionForm.amount) <= 0) {
      toast({ title: "Validation Error", description: "Amount must be greater than 0", variant: "destructive" });
      return;
    }
    setSavingCommission(true);
    try {
      const res = await fetch("/api/admin/commissions", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCommission.id,
          amount: parseFloat(editCommissionForm.amount),
          rate: parseFloat(editCommissionForm.rate) || 0,
          description: editCommissionForm.description || null,
          type: editCommissionForm.type,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update commission");
      }
      toast({ title: "Commission Updated", description: "The commission has been successfully updated" });
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update commission", variant: "destructive" });
    } finally {
      setSavingCommission(false);
    }
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

      {/* Referral-wise Commission Cards */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <div className="flex gap-1">
            {["", "pending", "approved", "released", "failed"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 text-sm font-medium rounded-lg ${statusFilter === s ? "bg-rx-primary-light text-rx-primary font-semibold" : "text-rx-gray-500 hover:bg-rx-gray-50"}`}>
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rx-primary text-white rounded-lg text-xs font-semibold hover:bg-rx-primary-dark transition-colors"
            ><Plus className="w-3 h-3" /> Add Commission</button>
            <button
              onClick={() => {
                const headers = ["Referral Name", "Referral Email", "Referral Phone", "Referral Status", "Ambassador", "Amount", "Type", "Commission Status", "Date"];
                const rows = commissions.map(c => [
                  c.Referral?.visitorName || "-",
                  c.Referral?.visitorEmail || "-",
                  (c.Referral as any)?.visitorPhone || "-",
                  c.Referral?.status || "-",
                  c.Affiliate?.User?.name || c.Affiliate?.referralCode || "Unknown",
                  c.amount.toString(),
                  c.type,
                  c.status,
                  formatDate(c.createdAt),
                ]);
                downloadCSV("commissions.csv", headers, rows);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            ><Download className="w-3 h-3" /> Export</button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : commissions.length === 0 ? (
          <EmptyState title="No commissions found" description={statusFilter ? "Try adjusting your filter" : "Commissions will appear here once referrals are marked as enrolled"} />
        ) : (
          <div className="divide-y divide-rx-gray-100">
            {commissions.map((c) => {
              const affName = c.Affiliate?.User?.name || c.Affiliate?.referralCode || "Unknown";
              const affEmail = c.Affiliate?.User?.email || "";
              const ref = c.Referral;
              const refName = ref?.visitorName;
              const refEmail = ref?.visitorEmail;
              const refPhone = (ref as any)?.visitorPhone;
              const refStatus = ref?.status;
              const hasReferral = !!ref;

              return (
                <div key={c.id} className="px-5 py-4 hover:bg-rx-gray-50/50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Referral Info — Primary */}
                    <div className="flex-1 min-w-0">
                      {hasReferral ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-rx-primary-light flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-rx-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-rx-gray-800 truncate">{refName || "Unknown"}</p>
                              <div className="flex items-center gap-3 flex-wrap">
                                {refEmail && (
                                  <span className="inline-flex items-center gap-1 text-xs text-rx-gray-500">
                                    <Mail className="w-3 h-3" /> {refEmail}
                                  </span>
                                )}
                                {refPhone && (
                                  <span className="inline-flex items-center gap-1 text-xs text-rx-gray-500">
                                    <Phone className="w-3 h-3" /> {refPhone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-10">
                            <span className="text-[11px] text-rx-gray-400 uppercase tracking-wide font-medium">Referral Status</span>
                            <StatusBadge status={refStatus as any} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-rx-gray-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-rx-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm text-rx-gray-400 italic">No linked referral</p>
                            {c.description && <p className="text-xs text-rx-gray-500">{c.description}</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ambassador — who referred */}
                    <div className="flex items-center gap-2 lg:w-44 shrink-0">
                      <div className="text-xs text-rx-gray-400 uppercase tracking-wide font-medium lg:hidden">Ambassador</div>
                      <div>
                        <p className="text-sm font-medium text-rx-gray-700 truncate">{affName}</p>
                        {affEmail && <p className="text-xs text-rx-gray-400 truncate">{affEmail}</p>}
                      </div>
                    </div>

                    {/* Commission Amount */}
                    <div className="lg:w-28 shrink-0">
                      <div className="text-xs text-rx-gray-400 uppercase tracking-wide font-medium lg:hidden">Amount</div>
                      <p className="text-lg font-bold text-rx-gray-900">{formatCurrency(c.amount)}</p>
                      <p className="text-xs text-rx-gray-400">{c.type} &middot; {c.rate}%</p>
                    </div>

                    {/* Commission Status */}
                    <div className="lg:w-28 shrink-0">
                      <div className="text-xs text-rx-gray-400 uppercase tracking-wide font-medium lg:hidden">Commission Status</div>
                      <StatusBadge status={c.status as any} />
                      <p className="text-[11px] text-rx-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 lg:w-56 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(c)}
                        className="text-xs px-2.5 py-1.5 bg-rx-gray-100 text-rx-gray-700 rounded-lg hover:bg-rx-gray-200 font-medium flex items-center gap-1 transition-colors"
                        title="Edit Commission"
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      {c.referralId && (
                        <button
                          onClick={() => handleViewReferral(c.referralId)}
                          className="text-xs px-2.5 py-1.5 bg-rx-primary-light text-rx-primary rounded-lg hover:bg-rx-primary/20 font-medium flex items-center gap-1 transition-colors"
                          title="View Referral"
                        >
                          <Eye className="w-3 h-3" /> Referral
                        </button>
                      )}
                      {c.status === "pending" && (
                        <>
                          <button onClick={() => handleStatusChange(c.id, "approved")} className="text-xs px-2.5 py-1.5 bg-rx-secondary-light text-rx-secondary rounded-lg hover:bg-rx-secondary/20 font-medium transition-colors">Approve</button>
                          <button onClick={() => handleStatusChange(c.id, "failed")} className="text-xs px-2.5 py-1.5 bg-rx-danger-light text-rx-danger rounded-lg hover:bg-rx-danger/20 font-medium transition-colors">Reject</button>
                        </>
                      )}
                      {c.status === "approved" && (
                        <button onClick={() => handleStatusChange(c.id, "released")} className="text-xs px-2.5 py-1.5 bg-rx-info-light text-rx-info rounded-lg hover:bg-rx-info/20 font-medium transition-colors">Release</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bonus Structure Card */}
      <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-emerald-100 bg-emerald-50/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Gift className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-emerald-800">Bonus Structure</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Reward Tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Tier 1 — Submission Bonus</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 mb-1">$50</p>
              <p className="text-xs text-emerald-600">Per referral for submitted enrollment</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Tier 2 — Enrollment Bonus</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 mb-1">$100</p>
              <p className="text-xs text-emerald-600">When referral schedules a session and gets enrolled</p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">How Commissions Work</span>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                <p className="text-sm text-emerald-700">When a referral is marked as <span className="font-semibold">"Enrolled"</span>, a commission is automatically created with status <StatusBadge status="pending" />.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                <p className="text-sm text-emerald-700">Admin reviews and can <span className="font-semibold text-emerald-800">Approve</span> the commission to confirm eligibility.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                <p className="text-sm text-emerald-700">Once approved, admin can <span className="font-semibold text-emerald-800">Release</span> the commission to make it available for payout.</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                <p className="text-sm text-emerald-700">Released commissions are then <span className="font-semibold text-emerald-800">Paid</span> out to the ambassador through the payout process.</p>
              </div>
            </div>
          </div>

          {/* Commission Flow */}
          <div className="flex items-center justify-center gap-2 py-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rx-warning-light text-rx-warning">Pending</span>
            <span className="text-emerald-400">&rarr;</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rx-secondary-light text-rx-secondary">Approved</span>
            <span className="text-emerald-400">&rarr;</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rx-info-light text-rx-info">Released</span>
            <span className="text-emerald-400">&rarr;</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rx-secondary-light text-rx-secondary">Paid</span>
          </div>
        </div>
      </div>

      {/* Add Commission Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Add Commission</h3>
              <button onClick={() => setShowAddModal(false)} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              {/* Ambassador Select */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Ambassador <span className="text-rx-danger">*</span></label>
                <select
                  value={addForm.affiliateId}
                  onChange={(e) => setAddForm({ ...addForm, affiliateId: e.target.value })}
                  disabled={affiliatesLoading}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light disabled:opacity-50"
                >
                  <option value="">{affiliatesLoading ? "Loading..." : "Select an ambassador"}</option>
                  {affiliates.map((aff) => (
                    <option key={aff.id} value={aff.id}>
                      {aff.User?.name || aff.referralCode} {aff.User?.email ? `(${aff.User.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Amount <span className="text-rx-danger">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-rx-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addForm.amount}
                    onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  />
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={addForm.rate}
                    onChange={(e) => setAddForm({ ...addForm, rate: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-rx-gray-400">%</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="Optional description for this commission"
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                />
              </div>

              {/* Referral ID */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Referral ID</label>
                <input
                  type="text"
                  value={addForm.referralId}
                  onChange={(e) => setAddForm({ ...addForm, referralId: e.target.value })}
                  placeholder="Optional — link to existing referral"
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCommission}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> {submitting ? "Creating..." : "Create Commission"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        <option value="opened">Opened</option>
                        <option value="submitted">Submitted</option>
                        <option value="pending">Pending</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="not_enrolled">Not Enrolled</option>
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

      {/* Edit Commission Modal */}
      {showEditModal && editingCommission && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-rx-gray-800">Edit Commission</h3>
                <p className="text-xs text-rx-gray-500 mt-0.5">
                  {editingCommission.Referral?.visitorName || editingCommission.Referral?.visitorEmail || "No referral"} &middot; <StatusBadge status={editingCommission.status as any} />
                </p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Amount <span className="text-rx-danger">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-rx-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editCommissionForm.amount}
                    onChange={(e) => setEditCommissionForm({ ...editCommissionForm, amount: e.target.value })}
                    className="w-full pl-7 pr-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  />
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Rate (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editCommissionForm.rate}
                    onChange={(e) => setEditCommissionForm({ ...editCommissionForm, rate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-rx-gray-400">%</span>
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Type</label>
                <select
                  value={editCommissionForm.type}
                  onChange={(e) => setEditCommissionForm({ ...editCommissionForm, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                >
                  <option value="commission">Commission</option>
                  <option value="referral">Referral</option>
                  <option value="bonus">Bonus</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Description</label>
                <textarea
                  value={editCommissionForm.description}
                  onChange={(e) => setEditCommissionForm({ ...editCommissionForm, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light resize-none"
                />
              </div>

              {/* Warning for already-approved commissions */}
              {['approved', 'released', 'paid'].includes(editingCommission.status) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    This commission is already <span className="font-semibold">{editingCommission.status}</span>. Changing the amount will automatically adjust the affiliate&apos;s earnings balance.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCommission}
                  disabled={savingCommission}
                  className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> {savingCommission ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
