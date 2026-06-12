"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, ErrorWithRetry, EmptyState, TableSkeleton, formatDate, getInitials } from "../shared";
import { Share2, UserPlus, RefreshCw, ArrowRight, Download, Clock, UserCheck, UserX, Upload, FileDown, Trash2, ChevronDown, Eye } from "lucide-react";

interface Referral {
  id: string;
  affiliateId: string;
  programId: string;
  linkId: string | null;
  referralCode: string;
  visitorEmail: string | null;
  visitorName: string | null;
  visitorPhone: string | null;
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

function parseCSV(text: string): string[][] {
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function getReferralStatus(r: Referral): { status: string; label: string } {
  if (r.status === "clicked" || r.status === "opened") {
    return { status: "opened", label: "Opened" };
  }
  if (r.status === "enrolled" || r.status === "converted" || r.status === "completed") {
    return { status: "enrolled", label: "Enrolled" };
  }
  if (r.status === "submitted") {
    return { status: "submitted", label: "Submitted" };
  }
  if (r.status === "pending") {
    const createdAt = new Date(r.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      return { status: "not_enrolled", label: "Not Enrolled" };
    }
    return { status: "pending", label: "Pending" };
  }
  if (r.status === "not_enrolled") {
    return { status: "not_enrolled", label: "Not Enrolled" };
  }
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

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Referral | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status change state
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);

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

  const handleImport = async (file: File) => {
    setImportLoading(true);
    setImportResult(null);
    setImportError(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setImportError("CSV file is empty or has no data rows");
        setImportLoading(false);
        return;
      }

      const headers = rows[0];
      const referrals = rows.slice(1).map(row => ({
        ambassadorEmail: row[headers.indexOf('Ambassador Email')] || '',
        visitorName: row[headers.indexOf('Visitor Name')] || '',
        visitorEmail: row[headers.indexOf('Visitor Email')] || '',
        visitorPhone: row[headers.indexOf('Visitor Phone')] || '',
        source: row[headers.indexOf('Source')] || 'import',
        status: row[headers.indexOf('Status')] || 'submitted',
      })).filter(r => r.ambassadorEmail);

      if (referrals.length === 0) {
        setImportError("No valid rows found in CSV");
        setImportLoading(false);
        return;
      }

      const res = await fetch("/api/admin/referrals/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ referrals }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");

      setImportResult(json);
      fetchData();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/referrals/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete referral");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (referralId: string, newStatus: string) => {
    setStatusLoading(referralId);
    setOpenStatusDropdown(null);
    try {
      const res = await fetch(`/api/admin/referrals/${referralId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStatusLoading(null);
    }
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const referrals = data?.referrals || [];
  const total = data?.total || 0;

  const realReferrals = referrals.filter(r => r.status !== "clicked" && r.status !== "opened");
  const submittedCount = realReferrals.filter(r => getReferralStatus(r).status === "submitted").length;
  const enrolledCount = realReferrals.filter(r => getReferralStatus(r).status === "enrolled").length;
  const pendingCount = realReferrals.filter(r => getReferralStatus(r).status === "pending").length;
  const notEnrolledCount = realReferrals.filter(r => getReferralStatus(r).status === "not_enrolled").length;
  const openedCount = referrals.filter(r => r.status === "clicked" || r.status === "opened").length;

  const filteredReferrals = statusFilter === ""
    ? referrals
    : referrals.filter(r => getReferralStatus(r).status === statusFilter);

  const statusOptions = [
    { value: 'opened', label: 'Opened' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'pending', label: 'Pending' },
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'not_enrolled', label: 'Not Enrolled' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Referrals" value={realReferrals.length.toLocaleString()} iconColor="primary" icon={<Share2 className="w-[18px] h-[18px]" />} />
            <KpiCard label="Opened" value={openedCount.toLocaleString()} iconColor="info" icon={<Eye className="w-[18px] h-[18px]" />} />
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
          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 bg-white hover:bg-rx-gray-50"
            >
              <option value="">All Status</option>
              <option value="opened">Opened</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="enrolled">Enrolled</option>
              <option value="not_enrolled">Not Enrolled</option>
            </select>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            ><Upload className="w-3 h-3" /> Import</button>
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
          <TableSkeleton rows={5} cols={7} />
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
                  <th className="px-5 py-3">Actions</th>
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
                      <td className="px-5 py-3.5">
                        <div className="relative">
                          <button
                            onClick={() => setOpenStatusDropdown(openStatusDropdown === r.id ? null : r.id)}
                            disabled={statusLoading === r.id}
                            className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                            title="Click to change status"
                          >
                            <div className="flex items-center gap-1">
                              <StatusBadge status={statusInfo.status as any} />
                              <ChevronDown className="w-3 h-3 text-rx-gray-400" />
                            </div>
                          </button>
                          {openStatusDropdown === r.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenStatusDropdown(null)} />
                              <div className="absolute left-0 top-full mt-1 bg-white border border-rx-gray-200 rounded-lg shadow-lg z-20 min-w-[140px] py-1">
                                {statusOptions.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => handleStatusChange(r.id, opt.value)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-rx-gray-50 transition-colors ${
                                      statusInfo.status === opt.value ? 'font-semibold text-rx-primary' : 'text-rx-gray-700'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg text-rx-gray-400 hover:text-rx-danger hover:bg-rx-danger-light transition-colors"
                          title="Delete referral"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Import Referrals</h3>
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportError(null); }} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>

            {importError && <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{importError}</div>}

            {importResult ? (
              <div className="space-y-3">
                <div className="p-4 bg-rx-secondary-light rounded-lg">
                  <div className="text-sm font-semibold text-rx-secondary">Import Complete</div>
                  <div className="mt-2 text-sm text-rx-gray-700">
                    <span className="font-semibold text-rx-secondary">{importResult.created}</span> created,{' '}
                    <span className="font-semibold text-rx-danger">{importResult.failed}</span> failed
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <div className="text-xs font-semibold text-rx-gray-600 mb-2">Errors:</div>
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="text-xs text-rx-danger mb-1">Row {e.row}: {e.message}</div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setShowImport(false); setImportResult(null); }}
                  className="w-full py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
                >Done</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => {
                      const headers = ["Ambassador Email", "Visitor Name", "Visitor Email", "Visitor Phone", "Source", "Status"];
                      downloadCSV("referral_template.csv", headers, []);
                    }}
                    className="inline-flex items-center gap-1.5 text-sm text-rx-primary hover:underline font-medium"
                  ><FileDown className="w-4 h-4" /> Download Template</button>
                  <p className="text-xs text-rx-gray-500 mt-1">Download the CSV template, fill in your data, and upload it below.</p>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-rx-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-rx-primary hover:bg-rx-primary-light/20 transition-colors"
                >
                  <Upload className="w-8 h-8 text-rx-gray-400 mx-auto mb-2" />
                  <div className="text-sm font-medium text-rx-gray-600">
                    {importLoading ? "Uploading..." : "Click to upload CSV file"}
                  </div>
                  <div className="text-xs text-rx-gray-400 mt-1">.csv files only</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImport(file);
                  }}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowImport(false); setImportError(null); }}
                    className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50"
                  >Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rx-danger-light flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rx-danger" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-rx-gray-800">Delete Referral</h3>
                <p className="text-sm text-rx-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-rx-gray-600 mb-5">
              Are you sure you want to delete the referral for <span className="font-semibold">{deleteTarget.visitorName || deleteTarget.visitorEmail || 'this visitor'}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50"
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 bg-rx-danger text-white rounded-lg text-sm font-semibold hover:bg-rx-danger/90 disabled:opacity-50"
              >{deleteLoading ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
