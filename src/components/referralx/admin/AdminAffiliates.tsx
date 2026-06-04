"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, KpiCardSkeleton, StatusBadge, Avatar, ProgressBar, ErrorWithRetry, EmptyState, TableSkeleton, formatCurrency, formatDate } from "../shared";
import { Users, UserPlus, UserCheck, UserX, Filter, Download, Search, Plus } from "lucide-react";

interface AffiliateUser {
  id: string;
  email: string;
  name: string;
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
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", referralCode: "", commissionRate: "10", tier: "standard" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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
        throw new Error(errData.error || "Failed to load affiliates");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load affiliates");
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
      if (!res.ok) throw new Error(json.error || "Failed to create affiliate");
      setShowInvite(false);
      setInviteForm({ name: "", email: "", referralCode: "", commissionRate: "10", tier: "standard" });
      fetchData();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const affiliates = data?.affiliates || [];
  const total = data?.total || 0;
  const activeCount = affiliates.filter((a) => a.status === "active").length;
  const inactiveCount = affiliates.filter((a) => a.status === "inactive").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)
        ) : (
          <>
            <KpiCard label="Total Affiliates" value={total.toLocaleString()} iconColor="primary" icon={<Users className="w-[18px] h-[18px]" />} />
            <KpiCard label="Active Affiliates" value={activeCount.toLocaleString()} iconColor="success" icon={<UserCheck className="w-[18px] h-[18px]" />} />
            <KpiCard label="With Earnings" value={affiliates.filter((a) => a.totalEarnings > 0).length.toLocaleString()} iconColor="warning" icon={<UserPlus className="w-[18px] h-[18px]" />} />
            <KpiCard label="Inactive" value={inactiveCount.toLocaleString()} iconColor="danger" icon={<UserX className="w-[18px] h-[18px]" />} />
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Affiliate List</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input
                type="text"
                placeholder="Search affiliates..."
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
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3" /> Filter</button>
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
            >
              <Plus className="w-3.5 h-3.5" /> Invite
            </button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : affiliates.length === 0 ? (
          <EmptyState title="No affiliates found" description={search || statusFilter ? "Try adjusting your filters" : "Invite your first affiliate to get started"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Affiliate</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3">Referrals</th>
                  <th className="px-5 py-3">Earnings</th>
                  <th className="px-5 py-3">Progress</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => {
                  const name = a.User?.name || "Unknown";
                  const email = a.User?.email || "";
                  const initials = name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
                  const maxEarnings = Math.max(...affiliates.map((af) => af.totalEarnings), 1);
                  const progress = maxEarnings > 0 ? Math.round((a.totalEarnings / maxEarnings) * 100) : 0;
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
                      <td className="px-5 py-3.5"><span className="text-xs font-mono bg-rx-gray-100 px-2 py-0.5 rounded">{a.referralCode}</span></td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700">{formatDate(a.joinedAt)}</td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700">{a.totalReferrals}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{formatCurrency(a.totalEarnings)}</td>
                      <td className="px-5 py-3.5"><ProgressBar value={progress} color={progress > 50 ? "success" : progress > 25 ? "primary" : "warning"} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={a.status as any} /></td>
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
              <h3 className="text-lg font-semibold text-rx-gray-800">Invite Affiliate</h3>
              <button onClick={() => setShowInvite(false)} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>
            {inviteError && <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{inviteError}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Name</label><input type="text" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="Full name" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Email</label><input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="email@example.com" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Referral Code</label><input type="text" value={inviteForm.referralCode} onChange={(e) => setInviteForm({ ...inviteForm, referralCode: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="e.g. john2024" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Commission Rate</label><input type="number" value={inviteForm.commissionRate} onChange={(e) => setInviteForm({ ...inviteForm, commissionRate: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Tier</label><select value={inviteForm.tier} onChange={(e) => setInviteForm({ ...inviteForm, tier: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"><option value="standard">Standard</option><option value="premium">Premium</option><option value="vip">VIP</option></select></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvite(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Cancel</button>
              <button onClick={handleInvite} disabled={inviteLoading} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50">{inviteLoading ? "Creating..." : "Create Affiliate"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
