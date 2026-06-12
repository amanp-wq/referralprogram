"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, ErrorWithRetry, EmptyState, TableSkeleton, formatCurrency, formatDate, getInitials } from "../shared";
import { Users, UserPlus, UserCheck, UserX, Download, Search, Plus, Phone, Upload, FileDown, Trash2, MoreHorizontal } from "lucide-react";

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

interface AffiliateUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl: string | null;
  status: string;
  createdAt: string;
}

interface Affiliate {
  id: string;
  referralCode: string;
  tier: string;
  commissionRate: number;
  totalEarnings: number;
  totalReferrals: number;
  totalConversions: number;
  balance: number;
  status: string;
  joinedAt: string;
  User: AffiliateUser;
}

interface AffiliatesResponse {
  affiliates: Affiliate[];
  total: number;
  page: number;
  limit: number;
}

export function AdminAffiliates() {
  const { token } = useAuth();
  const [data, setData] = useState<AffiliatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", phone: "", referralCode: "", commissionRate: "10", tier: "standard" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Import modal state
  const [showImport, setShowImport] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Affiliate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Status toggle loading
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/affiliates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load ambassadors");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load ambassadors");
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  const handleInvite = async () => {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create ambassador");
      setShowInvite(false);
      setInviteForm({ name: "", email: "", phone: "", referralCode: "", commissionRate: "10", tier: "standard" });
      fetchData();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

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
      const affiliates = rows.slice(1).map(row => ({
        name: row[headers.indexOf('Name')] || '',
        email: row[headers.indexOf('Email')] || '',
        phone: row[headers.indexOf('Phone')] || '',
        referralCode: row[headers.indexOf('Referral Code')] || '',
        commissionRate: row[headers.indexOf('Commission Rate')] || '10',
        tier: row[headers.indexOf('Tier')] || 'standard',
      })).filter(a => a.name && a.email);

      if (affiliates.length === 0) {
        setImportError("No valid rows found in CSV");
        setImportLoading(false);
        return;
      }

      const res = await fetch("/api/admin/affiliates/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ affiliates }),
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
      const res = await fetch(`/api/admin/affiliates/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete ambassador");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusToggle = async (affiliate: Affiliate) => {
    const newStatus = affiliate.status === 'active' ? 'inactive' : 'active';
    setStatusLoading(affiliate.id);
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: affiliate.id, status: newStatus }),
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

  const affiliates = data?.affiliates || [];
  const total = data?.total || 0;
  const activeCount = affiliates.filter((a) => a.status === "active").length;
  const withEarningsCount = affiliates.filter((a) => a.totalEarnings > 0).length;
  const inactiveCount = affiliates.filter((a) => a.status === "inactive").length;

  return (
    <div className="space-y-6">
      {/* Top Section: Successful Ambassadors with Earnings */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-rx-secondary-light flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-rx-secondary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-rx-gray-800">Successful Ambassadors with Earnings</h3>
            <p className="text-sm text-rx-gray-500">Ambassadors who have actually earned money from referrals</p>
          </div>
          <div className="ml-auto text-3xl font-bold text-rx-secondary">{withEarningsCount}</div>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Ambassadors" value={total.toLocaleString()} iconColor="primary" icon={<Users className="w-[18px] h-[18px]" />} />
            <KpiCard label="Active (60-day)" value={activeCount.toLocaleString()} iconColor="success" icon={<UserCheck className="w-[18px] h-[18px]" />} />
            <KpiCard label="With Earnings" value={withEarningsCount.toLocaleString()} iconColor="warning" icon={<UserPlus className="w-[18px] h-[18px]" />} />
            <KpiCard label="Inactive" value={inactiveCount.toLocaleString()} iconColor="danger" icon={<UserX className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

      {/* Ambassador List Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Ambassador List</h3>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input
                type="text"
                placeholder="Search ambassadors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-rx-gray-200 rounded-lg text-sm w-[200px] focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 bg-white hover:bg-rx-gray-50"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            ><Upload className="w-3 h-3" /> Import</button>
            <button
              onClick={() => {
                const headers = ["Name", "Email", "Phone", "Unique Link", "Referrals", "Earnings", "Conversion Ratio", "Status"];
                const rows = affiliates.map(a => [
                  a.User?.name || "Unknown",
                  a.User?.email || "-",
                  a.User?.phone || "-",
                  `/ref/${a.referralCode}`,
                  a.totalReferrals.toString(),
                  a.totalEarnings.toString(),
                  a.totalReferrals > 0 ? ((a.totalConversions / a.totalReferrals) * 100).toFixed(1) + "%" : "0%",
                  a.status,
                ]);
                downloadCSV("ambassadors.csv", headers, rows);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            ><Download className="w-3 h-3" /> Export</button>
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
            >
              <Plus className="w-3.5 h-3.5" /> Invite
            </button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : affiliates.length === 0 ? (
          <EmptyState title="No ambassadors found" description={search || statusFilter ? "Try adjusting your filters" : "Invite your first ambassador to get started"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Ambassador</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Unique Link</th>
                  <th className="px-5 py-3">Referrals</th>
                  <th className="px-5 py-3">Earnings</th>
                  <th className="px-5 py-3">Conversion Ratio</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => {
                  const name = a.User?.name || "Unknown";
                  const email = a.User?.email || "";
                  const phone = a.User?.phone || "";
                  const initials = getInitials(name);
                  const conversionRatio = a.totalReferrals > 0 ? ((a.totalConversions / a.totalReferrals) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={a.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} src={a.User?.avatarUrl} />
                          <div>
                            <div className="text-sm font-semibold text-rx-gray-800">{name}</div>
                            <div className="text-xs text-rx-gray-500">{email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-rx-gray-400" />
                          <span className="text-sm text-rx-gray-700">{phone || "-"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs font-mono bg-rx-gray-100 px-2 py-0.5 rounded">/ref/{a.referralCode}</span></td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700">{a.totalReferrals}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(a.totalEarnings)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-rx-gray-800">{conversionRatio}%</span>
                          <div className="w-16 h-1.5 bg-rx-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-rx-primary" style={{ width: `${Math.min(100, parseFloat(conversionRatio))}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleStatusToggle(a)}
                          disabled={statusLoading === a.id}
                          className="cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                          title={`Click to toggle status (currently ${a.status})`}
                        >
                          <StatusBadge status={a.status as any} />
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="p-1.5 rounded-lg text-rx-gray-400 hover:text-rx-danger hover:bg-rx-danger-light transition-colors"
                          title="Delete ambassador"
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

      {/* Invite Dialog */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Invite Ambassador</h3>
              <button onClick={() => setShowInvite(false)} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>
            {inviteError && <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{inviteError}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Name</label><input type="text" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="Full name" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Email</label><input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="email@example.com" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Phone</label><input type="tel" value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="+1 (555) 000-0000" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Referral Code</label><input type="text" value={inviteForm.referralCode} onChange={(e) => setInviteForm({ ...inviteForm, referralCode: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="e.g. john2024" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Commission Rate</label><input type="number" value={inviteForm.commissionRate} onChange={(e) => setInviteForm({ ...inviteForm, commissionRate: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Tier</label><select value={inviteForm.tier} onChange={(e) => setInviteForm({ ...inviteForm, tier: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"><option value="standard">Standard</option><option value="pro">Pro</option><option value="elite">Elite</option></select></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Cancel</button>
              <button onClick={handleInvite} disabled={inviteLoading} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50">{inviteLoading ? "Creating..." : "Create Ambassador"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Import Ambassadors</h3>
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
                      const headers = ["Name", "Email", "Phone", "Referral Code", "Commission Rate", "Tier"];
                      downloadCSV("ambassador_template.csv", headers, []);
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
                <h3 className="text-lg font-semibold text-rx-gray-800">Delete Ambassador</h3>
                <p className="text-sm text-rx-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-rx-gray-600 mb-5">
              Are you sure? This will delete ambassador <span className="font-semibold">{deleteTarget.User?.name}</span> and all their data (referrals, commissions, links).
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
