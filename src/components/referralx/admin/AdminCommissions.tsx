"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, ErrorWithRetry, EmptyState, TableSkeleton, formatCurrency, formatDate } from "../shared";
import { DollarSign, TrendingUp, Clock, AlertCircle, Download, CheckCircle, XCircle, Send, Eye, Pencil, X, Save, Plus, Gift, Info, User, Mail, ArrowRight, ChevronLeft, ChevronRight, Upload, FileDown } from "lucide-react";

const PER_PAGE_OPTIONS = [25, 50, 100, 200];

// Bonus import: system fields + CSV parsing
const BONUS_IMPORT_FIELDS: { key: string; label: string; note?: string }[] = [
  { key: "id", label: "Bonus ID", note: "match & update" },
  { key: "ambassadorEmail", label: "Ambassador Email", note: "for new bonuses" },
  { key: "amount", label: "Amount" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "description", label: "Description" },
];

function parseBonusCSV(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = []; let row: string[] = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* ignore */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function guessBonusColumn(headers: string[], field: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const targets: Record<string, string[]> = {
    id: ["bonusid", "id", "commissionid"],
    ambassadorEmail: ["ambassadoremail", "ambassador", "affiliateemail", "email"],
    amount: ["amount"],
    type: ["type"],
    status: ["status", "commissionstatus"],
    description: ["description", "notes", "note"],
  };
  const cands = targets[field] || [];
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (cands.some((c) => h === c || h.includes(c))) return i;
  }
  return -1;
}

function getPageNumbers(current: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);
  return pages;
}
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
  type: string;
  status: string;
  payoutId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  Affiliate?: { id: string; referralCode: string; User?: { name: string; email: string } };
  Referral?: { id: string; visitorName: string | null; visitorEmail: string | null; status: string; createdAt: string };
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
  sums?: { total: number; pending: number; approved: number; released: number; failed: number };
}

export function AdminCommissions() {
  const { token } = useAuth();
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Bonus import wizard state
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated?: number; skipped?: number; failed: number; errors: { row: number; message: string }[]; skippedDetails?: { row: number; ambassadorEmail: string; reason: string }[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [fieldMap, setFieldMap] = useState<Record<string, number>>({});
  const [updateFieldsSel, setUpdateFieldsSel] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [addForm, setAddForm] = useState({ affiliateId: "", programId: "", amount: "", description: "", referralId: "", type: "referral_bonus" });
  const [submitting, setSubmitting] = useState(false);

  // Edit Commission modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [editCommissionForm, setEditCommissionForm] = useState({ amount: "", description: "", type: "" });
  const [savingCommission, setSavingCommission] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(perPage));
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
  }, [token, statusFilter, page, perPage]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  // ── Bonus import wizard ──
  const openImport = () => {
    setShowImport(true); setImportStep(1); setImportResult(null); setImportError(null);
    setCsvHeaders([]); setCsvRows([]); setCsvFileName(""); setFieldMap({}); setUpdateFieldsSel({});
  };
  const handleFileSelected = async (file: File) => {
    setImportError(null); setImportResult(null);
    try {
      const rows = parseBonusCSV(await file.text());
      if (rows.length < 2) { setImportError("CSV file is empty or has no data rows"); return; }
      const headers = rows[0];
      setCsvHeaders(headers);
      setCsvRows(rows.slice(1));
      setCsvFileName(file.name);
      const map: Record<string, number> = {}; const sel: Record<string, boolean> = {};
      BONUS_IMPORT_FIELDS.forEach((f) => { map[f.key] = guessBonusColumn(headers, f.key); if (["amount", "type", "status", "description"].includes(f.key)) sel[f.key] = map[f.key] !== -1; });
      setFieldMap(map); setUpdateFieldsSel(sel);
      setImportStep(2);
    } catch (e: any) { setImportError(e.message || "Could not read the file"); }
  };
  const runBonusImport = async () => {
    setImportLoading(true); setImportError(null);
    try {
      const get = (row: string[], key: string) => { const i = fieldMap[key]; return i != null && i >= 0 ? (row[i] || "").trim() : ""; };
      const commissions = csvRows.map((row) => ({
        id: get(row, "id"), ambassadorEmail: get(row, "ambassadorEmail"), amount: get(row, "amount"),
        type: get(row, "type"), status: get(row, "status"), description: get(row, "description"),
      })).filter((r) => r.id || r.ambassadorEmail);
      if (commissions.length === 0) { setImportError("No rows with a Bonus ID or Ambassador Email found."); setImportLoading(false); return; }
      const updateFields = Object.keys(updateFieldsSel).filter((k) => updateFieldsSel[k]);
      const res = await fetch("/api/admin/commissions/import", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ commissions, updateFields, fileName: csvFileName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      setImportResult(json); setImportStep(3); fetchData();
    } catch (e: any) { setImportError(e.message); } finally { setImportLoading(false); }
  };
  const downloadSkipped = (details: { row: number; ambassadorEmail: string; reason: string }[]) => {
    downloadCSV("skipped_bonuses.csv", ["Row", "Ambassador Email", "Reason"], details.map((s) => [String(s.row), s.ambassadorEmail, s.reason]));
  };

  const fetchAffiliates = useCallback(async () => {
    setAffiliatesLoading(true);
    try {
      const [affiliatesRes, programsRes] = await Promise.all([
        fetch("/api/admin/affiliates?limit=100", { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
        fetch("/api/admin/programs?isActive=true", { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
      ]);
      if (!affiliatesRes.ok) throw new Error("Failed to load affiliates");
      const affiliatesJson = await affiliatesRes.json();
      setAffiliates(affiliatesJson.affiliates || []);
      if (programsRes.ok) {
        const programsJson = await programsRes.json();
        const programList = programsJson.programs || [];
        setPrograms(programList);
        // Auto-select first program if only one exists
        if (programList.length === 1) {
          setAddForm(prev => ({ ...prev, programId: programList[0].id }));
        }
      }
    } catch {
      toast({ title: "Error", description: "Failed to load ambassadors", variant: "destructive" });
    } finally {
      setAffiliatesLoading(false);
    }
  }, [token]);

  const handleOpenAddModal = () => {
    setAddForm({ affiliateId: "", programId: "", amount: "", description: "", referralId: "" });
    setShowAddModal(true);
    fetchAffiliates();
  };

  const handleSubmitCommission = async () => {
    if (!addForm.affiliateId) {
      toast({ title: "Validation Error", description: "Please select an ambassador", variant: "destructive" });
      return;
    }
    if (!addForm.programId) {
      toast({ title: "Validation Error", description: "Please select a program", variant: "destructive" });
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
          programId: addForm.programId,
          amount: parseFloat(addForm.amount),
          type: addForm.type,
          description: addForm.description || undefined,
          referralId: addForm.referralId || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create commission");
      }
      toast({ title: "Bonus Created", description: "The bonus has been successfully created" });
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create bonus", variant: "destructive" });
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
      description: commission.description || "",
      type: commission.type || "referral_bonus",
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
          description: editCommissionForm.description || null,
          type: editCommissionForm.type,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update commission");
      }
      toast({ title: "Bonus Updated", description: "The bonus has been successfully updated" });
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update bonus", variant: "destructive" });
    } finally {
      setSavingCommission(false);
    }
  };

  const handleDeleteCommission = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bonus? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/admin/commissions?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to delete bonus')
      }
      toast({ title: 'Bonus Deleted', description: 'The bonus has been removed.' })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete bonus', variant: 'destructive' })
    }
  }

  const handleQuickStatusChange = async (commissionId: string, newStatus?: string, newType?: string) => {
    try {
      const body: any = { id: commissionId }
      if (newStatus) body.status = newStatus
      if (newType) body.type = newType
      const res = await fetch("/api/admin/commissions", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update");
      }
      toast({ title: "Updated", description: newStatus ? `Commission marked as ${newStatus}` : `Type updated` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update", variant: "destructive" });
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
  // KPI sums come from the server (whole dataset), not just the current page.
  const sums = data?.sums || { total: 0, pending: 0, approved: 0, released: 0, failed: 0 };
  const totalAmount = sums.total;
  const pendingAmount = sums.pending;
  const approvedAmount = sums.approved;
  const releasedAmount = sums.released;
  const failedAmount = sums.failed;

  // Pagination math
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, total);
  const gotoPage = (p: number) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Bonuses" value={formatCurrency(totalAmount)} iconColor="primary" icon={<DollarSign className="w-[18px] h-[18px]" />} />
            <KpiCard label="Pending" value={formatCurrency(pendingAmount)} iconColor="warning" icon={<Clock className="w-[18px] h-[18px]" />} />
            <KpiCard label="Approved" value={formatCurrency(approvedAmount)} iconColor="success" icon={<CheckCircle className="w-[18px] h-[18px]" />} />
            <KpiCard label="Released" value={formatCurrency(releasedAmount)} iconColor="info" icon={<Send className="w-[18px] h-[18px]" />} />
            <KpiCard label="Failed" value={formatCurrency(failedAmount)} iconColor="danger" icon={<XCircle className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

      {/* Referral-wise Commission Cards */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <div className="flex gap-1">
            {["", "pending", "approved", "released", "failed", "cancelled"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`px-4 py-2 text-sm font-medium rounded-lg ${statusFilter === s ? "bg-rx-primary-light text-rx-primary font-semibold" : "text-rx-gray-500 hover:bg-rx-gray-50"}`}>
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rx-primary text-white rounded-lg text-xs font-semibold hover:bg-rx-primary-dark transition-colors"
            ><Plus className="w-3 h-3" /> Add Bonus</button>
            <button
              onClick={openImport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            ><Upload className="w-3 h-3" /> Import</button>
            <button
              onClick={() => {
                // Columns are import-compatible: keep "Bonus ID" to update rows on re-import.
                const headers = ["Bonus ID", "Ambassador Email", "Amount", "Type", "Status", "Description", "Referral Name", "Referral Email", "Date"];
                const rows = commissions.map(c => [
                  c.id,
                  c.Affiliate?.User?.email || "",
                  c.amount.toString(),
                  c.type,
                  c.status,
                  (c as any).description || "",
                  c.Referral?.visitorName || "-",
                  c.Referral?.visitorEmail || "-",
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
          <EmptyState title="No bonuses found" description={statusFilter ? "Try adjusting your filter" : "Bonuses will appear here once referrals are marked as enrolled"} />
        ) : (
          <div>
            {/* Table Header */}
            <div className="hidden lg:grid items-center gap-4 px-5 py-2.5 bg-rx-gray-50 border-b border-rx-gray-200 text-xs font-semibold text-rx-gray-500 uppercase tracking-wide" style={{ gridTemplateColumns: "1fr 11rem 9rem 9rem 16rem" }}>
              <div>Referral</div>
              <div>Ambassador</div>
              <div>Amount / Type</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
          <div className="divide-y divide-rx-gray-100">
            {commissions.map((c) => {
              const affName = c.Affiliate?.User?.name || c.Affiliate?.referralCode || "Unknown";
              const affEmail = c.Affiliate?.User?.email || "";
              const ref = c.Referral;
              const refName = ref?.visitorName;
              const refEmail = ref?.visitorEmail;
              const refStatus = ref?.status;
              const hasReferral = !!ref;

              return (
                <div key={c.id} className="px-5 py-4 hover:bg-rx-gray-50/50 transition-colors">
                  <div className="flex flex-col lg:grid lg:items-center gap-4" style={{ gridTemplateColumns: "1fr 11rem 9rem 9rem 16rem" }}>
                    {/* Referral Info — Primary */}
                    <div className="min-w-0">
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
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="text-xs text-rx-gray-400 uppercase tracking-wide font-medium lg:hidden">Ambassador</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-rx-gray-700 truncate">{affName}</p>
                        {affEmail && <p className="text-xs text-rx-gray-400 truncate">{affEmail}</p>}
                      </div>
                    </div>

                    {/* Commission Amount + Type */}
                    <div className="min-w-0">
                      <div className="text-xs text-rx-gray-400 uppercase tracking-wide font-medium lg:hidden">Amount</div>
                      <p className="text-lg font-bold text-rx-gray-900">{formatCurrency(c.amount)}</p>
                      <select
                        value={c.type}
                        onChange={(e) => handleQuickStatusChange(c.id, undefined, e.target.value)}
                        className="text-xs px-2 py-1 border border-rx-gray-200 rounded-lg bg-white focus:outline-none focus:border-rx-primary cursor-pointer mt-0.5"
                      >
                        <option value="referral_bonus">Referral Bonus</option>
                        <option value="helping_bonus">Helping Bonus</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="bonus">Commission</option>
                      </select>
                    </div>

                    {/* Commission Status */}
                    <div className="min-w-0">
                      <div className="text-xs text-rx-gray-400 uppercase tracking-wide font-medium lg:hidden">Commission Status</div>
                      <select
                        value={c.status}
                        onChange={(e) => handleQuickStatusChange(c.id, e.target.value, undefined)}
                        className="text-xs px-2.5 py-1.5 border border-rx-gray-200 rounded-lg bg-white focus:outline-none focus:border-rx-primary cursor-pointer font-medium"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="released">Released</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <p className="text-[11px] text-rx-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
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
                          <button onClick={() => handleStatusChange(c.id, "cancelled")} className="text-xs px-2.5 py-1.5 bg-rx-danger-light text-rx-danger rounded-lg hover:bg-rx-danger/20 font-medium transition-colors">Reject</button>
                        </>
                      )}
                      {c.status === "approved" && (
                        <>
                          <button onClick={() => handleStatusChange(c.id, "released")} className="text-xs px-2.5 py-1.5 bg-rx-info-light text-rx-info rounded-lg hover:bg-rx-info/20 font-medium transition-colors">Release</button>
                          <button onClick={() => handleStatusChange(c.id, "pending")} className="text-xs px-2.5 py-1.5 bg-rx-warning-light text-rx-warning rounded-lg hover:bg-rx-warning/20 font-medium transition-colors">Revert to Pending</button>
                        </>
                      )}
                      <div className="w-px h-4 bg-rx-gray-200 mx-1" />
                      <button
                        onClick={() => handleDeleteCommission(c.id)}
                        className="text-[11px] px-2 py-1 text-rx-gray-400 hover:text-rx-danger hover:bg-rx-danger-light rounded font-medium flex items-center gap-0.5 transition-colors"
                        title="Delete Bonus"
                      >
                        <X className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-rx-gray-100">
            <div className="flex items-center gap-2 text-xs text-rx-gray-500 flex-wrap">
              <span>Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {total.toLocaleString()}</span>
              <span className="mx-1">·</span>
              <label className="flex items-center gap-1.5">
                Show per page
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="px-2 py-1 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-700 bg-white">
                  {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button onClick={() => gotoPage(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? <span key={`e${i}`} className="px-2 text-xs text-rx-gray-400">…</span>
                  : <button key={p} onClick={() => gotoPage(p as number)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${p === page ? "bg-rx-primary text-white" : "border border-rx-gray-200 text-rx-gray-600 hover:bg-rx-gray-50"}`}>{p}</button>
              )}
              <button onClick={() => gotoPage(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
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
              <span className="text-sm font-semibold text-emerald-800">How Bonuses Work</span>
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

      {/* Bonus Import Wizard */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-rx-gray-800">Import Bonuses</h3>
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportError(null); }} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>
            {importError && <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{importError}</div>}

            {importStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-rx-gray-500">Rows with a <b>Bonus ID</b> update that bonus; rows without one create a new bonus (needs Ambassador Email + Amount). Tip: use the <b>Export</b> button to get a CSV with Bonus IDs, edit it, then re-import.</p>
                <button onClick={() => downloadCSV("bonus_template.csv", ["Bonus ID", "Ambassador Email", "Amount", "Type", "Status", "Description"], [])} className="inline-flex items-center gap-1.5 text-sm text-rx-primary hover:underline font-medium"><FileDown className="w-4 h-4" /> Download template</button>
                <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-rx-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-rx-primary hover:bg-rx-primary-light/20 transition-colors">
                  <Upload className="w-8 h-8 text-rx-gray-400 mx-auto mb-2" />
                  <div className="text-sm font-medium text-rx-gray-600">Click to choose a CSV file</div>
                  <div className="text-xs text-rx-gray-400 mt-1">.csv files only</div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ""; }} />
              </div>
            )}

            {importStep === 2 && (
              <div className="space-y-4">
                <div className="text-xs text-rx-gray-500">File: <span className="font-semibold text-rx-gray-700">{csvFileName}</span> · {csvRows.length} row(s)</div>
                <div className="text-sm font-semibold text-rx-gray-700">Map your CSV columns</div>
                <div className="space-y-2">
                  {BONUS_IMPORT_FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center gap-3">
                      <div className="w-44 text-sm text-rx-gray-700">{f.label}{f.note && <span className="text-xs text-rx-gray-400"> ({f.note})</span>}</div>
                      <select value={fieldMap[f.key] ?? -1} onChange={(e) => setFieldMap({ ...fieldMap, [f.key]: Number(e.target.value) })} className="flex-1 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-sm text-rx-gray-700 bg-white">
                        <option value={-1}>— Not mapped —</option>
                        {csvHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                      </select>
                      {["amount", "type", "status", "description"].includes(f.key) && (
                        <label className="flex items-center gap-1 text-xs text-rx-gray-500 w-24"><input type="checkbox" checked={!!updateFieldsSel[f.key]} onChange={(e) => setUpdateFieldsSel({ ...updateFieldsSel, [f.key]: e.target.checked })} /> update</label>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-rx-gray-500">For matched (Bonus ID) rows, only the ticked fields are overwritten.</p>
                <div className="flex gap-3 justify-between pt-2">
                  <button onClick={() => setImportStep(1)} className="px-4 py-2 border border-rx-gray-200 rounded-lg text-sm text-rx-gray-600 hover:bg-rx-gray-50">Back</button>
                  <button onClick={runBonusImport} disabled={importLoading} className="px-5 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50">{importLoading ? "Importing…" : `Import ${csvRows.length} row(s)`}</button>
                </div>
              </div>
            )}

            {importStep === 3 && importResult && (
              <div className="space-y-3">
                <div className="p-4 bg-rx-secondary-light rounded-lg text-sm text-rx-gray-700">
                  <span className="font-semibold text-rx-secondary">{importResult.created}</span> created
                  {typeof importResult.updated === "number" && <>, <span className="font-semibold text-rx-info">{importResult.updated}</span> updated</>}
                  {importResult.skipped ? <>, <span className="font-semibold text-rx-warning">{importResult.skipped}</span> skipped</> : null}
                  , <span className="font-semibold text-rx-danger">{importResult.failed}</span> failed
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto"><div className="text-xs font-semibold text-rx-gray-600 mb-1">Errors:</div>{importResult.errors.map((e, i) => <div key={i} className="text-xs text-rx-danger mb-1">Row {e.row}: {e.message}</div>)}</div>
                )}
                {importResult.skippedDetails && importResult.skippedDetails.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1"><div className="text-xs font-semibold text-rx-gray-600">Skipped rows:</div><button onClick={() => downloadSkipped(importResult.skippedDetails!)} className="inline-flex items-center gap-1 text-xs text-rx-primary hover:underline font-medium"><FileDown className="w-3.5 h-3.5" /> Download skipped</button></div>
                    <div className="max-h-32 overflow-y-auto">{importResult.skippedDetails.map((s, i) => <div key={i} className="text-xs text-rx-warning mb-1">Row {s.row}: {s.reason}</div>)}</div>
                  </div>
                )}
                <button onClick={() => { setShowImport(false); setImportResult(null); }} className="w-full py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Commission Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Add Bonus</h3>
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

              {/* Program Select */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Program <span className="text-rx-danger">*</span></label>
                <select
                  value={addForm.programId}
                  onChange={(e) => setAddForm({ ...addForm, programId: e.target.value })}
                  disabled={affiliatesLoading}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light disabled:opacity-50"
                >
                  <option value="">{affiliatesLoading ? "Loading..." : "Select a program"}</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {programs.length === 0 && !affiliatesLoading && (
                  <p className="mt-1 text-xs text-rx-danger">No active programs found. Create a program first.</p>
                )}
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

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Type <span className="text-rx-danger">*</span></label>
                <select
                  value={addForm.type}
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                >
                  <option value="referral_bonus">Referral Bonus</option>
                  <option value="helping_bonus">Helping Bonus</option>
                  <option value="adjustment">Adjustment</option>
                </select>
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
                <h3 className="text-lg font-semibold text-rx-gray-800">Edit Bonus</h3>
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

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Type</label>
                <select
                  value={editCommissionForm.type}
                  onChange={(e) => setEditCommissionForm({ ...editCommissionForm, type: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                >
                  <option value="referral_bonus">Referral Bonus</option>
                  <option value="helping_bonus">Helping Bonus</option>
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
