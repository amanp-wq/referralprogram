"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge, Avatar, getInitials } from "../shared";
import {
  Users, UserCheck, Clock, UserX, Download, RefreshCw, AlertCircle, ExternalLink, UserPlus, X, FileDown,
} from "lucide-react";
import { formatPhone } from "@/lib/utils";
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
  resumeUrl?: string | null;
  notes?: string | null;
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
  if (ref.status === "enrolled") return "enrolled";
  if (ref.status === "submitted") return "submitted";
  if (ref.status === "opened") return "opened";
  const daysSince = getDaysSince(ref.createdAt);
  if (ref.status === "pending") {
    if (daysSince > 30) return "not enrolled";
    return "pending";
  }
  if (ref.status === "cancelled" || ref.status === "not_enrolled") {
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
  const { token, affiliate } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");

  // Add Referral modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [addResumeFile, setAddResumeFile] = useState<File | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add referral");
      // Upload resume if provided
      if (addResumeFile && data.id) {
        const fd = new FormData();
        fd.append("file", addResumeFile);
        fd.append("referralId", data.id);
        await fetch("/api/upload/resume", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      setAddSuccess(true);
      setAddForm({ name: "", email: "", phone: "", notes: "" });
      setAddResumeFile(null);
      await fetchReferrals();
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

  const handleViewResume = async (fileName: string) => {
    const res = await fetch(`/api/upload/resume-url?file=${encodeURIComponent(fileName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  };

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
            label="Submitted"
            value={submittedCount.toLocaleString()}
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
            <button
              onClick={() => { setShowAddModal(true); setAddError(null); setAddSuccess(false); setAddForm({ name: "", email: "", phone: "", notes: "" }); setAddResumeFile(null); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rx-primary text-white rounded-lg text-xs font-semibold hover:bg-rx-primary-dark"
            >
              <UserPlus className="w-3 h-3" /> Add Referral
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
                  <th className="px-5 py-3">Notes / Resume</th>
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
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          {r.notes && (
                            <div className="text-xs text-rx-gray-500 bg-rx-gray-50 rounded-lg px-2.5 py-1.5 border border-rx-gray-100 max-w-[200px]">
                              <span className="font-medium text-rx-gray-600 block mb-0.5">Notes</span>
                              <span className="leading-relaxed line-clamp-2">{r.notes}</span>
                            </div>
                          )}
                          {r.resumeUrl ? (
                            <button onClick={() => handleViewResume(r.resumeUrl!)} className="inline-flex items-center gap-1 text-xs text-rx-primary hover:underline">
                              <FileDown className="w-3 h-3" /> View resume
                            </button>
                          ) : (
                            <span className="text-xs text-rx-gray-400">—</span>
                          )}
                        </div>
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
