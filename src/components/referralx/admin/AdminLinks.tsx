"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, CopyButton, ErrorWithRetry, EmptyState, CardSkeleton } from "../shared";
import { Link2, MousePointer, ShoppingBag, Plus, ExternalLink } from "lucide-react";

interface LinkItem {
  id: string;
  affiliateId: string;
  programId: string;
  code: string;
  url: string;
  clicks: number;
  conversions: number;
  isActive: boolean;
  label: string | null;
  createdAt: string;
  updatedAt: string;
  Affiliate?: { id: string; referralCode: string; User?: { name: string; email: string } };
  Program?: { id: string; name: string; slug: string };
}

interface LinksResponse {
  links: LinkItem[];
}

interface AffiliateOption {
  id: string;
  referralCode: string;
  User?: { name: string; email: string };
}

interface ProgramOption {
  id: string;
  name: string;
  slug: string;
}

export function AdminLinks() {
  const { token } = useAuth();
  const [data, setData] = useState<LinksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create link dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ affiliateId: "", programId: "", label: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/links", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load links");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load links");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  const fetchDropdowns = useCallback(async () => {
    setDropdownsLoading(true);
    try {
      const [affRes, progRes] = await Promise.all([
        fetch("/api/admin/affiliates", {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
        fetch("/api/admin/programs", {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
      ]);

      if (affRes.ok) {
        const affData = await affRes.json();
        setAffiliates(affData.affiliates || []);
      }

      if (progRes.ok) {
        const progData = await progRes.json();
        setPrograms(progData.programs || []);
      }
    } catch {
      // Silently fail - dropdowns will just be empty
    } finally {
      setDropdownsLoading(false);
    }
  }, [token]);

  const handleOpenCreate = () => {
    setCreateForm({ affiliateId: "", programId: "", label: "" });
    setCreateError(null);
    setShowCreateDialog(true);
    fetchDropdowns();
  };

  const handleCreate = async () => {
    if (!createForm.affiliateId || !createForm.programId) {
      setCreateError("Please select both an affiliate and a program.");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId: createForm.affiliateId,
          programId: createForm.programId,
          label: createForm.label || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create link");
      setShowCreateDialog(false);
      setCreateForm({ affiliateId: "", programId: "", label: "" });
      fetchData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const links = data?.links || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-rx-gray-800">Tracking Links</h3>
          <p className="text-sm text-rx-gray-500">Manage and monitor your referral tracking links</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
        >
          <Plus className="w-4 h-4" /> Create Link
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : links.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No tracking links yet" description="Links will appear here once affiliates create them" />
          </div>
        ) : (
          links.map((link) => {
            const convRate = link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : "0.0";
            const linkName = link.label || link.code || "Untitled Link";
            const affName = link.Affiliate?.User?.name || link.Affiliate?.referralCode || "Unknown";
            const programName = link.Program?.name || "-";
            return (
              <div key={link.id} className="bg-white rounded-2xl border border-rx-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-rx-primary-light flex items-center justify-center">
                      <Link2 className="w-4 h-4 text-rx-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-rx-gray-800 text-sm">{linkName}</h4>
                      <p className="text-xs text-rx-gray-500">{affName} &middot; {programName}</p>
                    </div>
                  </div>
                  <StatusBadge status={link.isActive ? "active" : "inactive"} />
                </div>
                <div className="bg-rx-gray-50 border border-rx-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-rx-gray-700 truncate mr-2">{link.url || `https://referralx.com/ref/${link.code}`}</span>
                  <CopyButton text={link.url || `https://referralx.com/ref/${link.code}`} label={<ExternalLink className="w-3.5 h-3.5" />} />
                </div>
                <div className="flex gap-5">
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-rx-gray-400" />
                    <div>
                      <div className="text-xs text-rx-gray-500">Clicks</div>
                      <div className="text-sm font-bold text-rx-gray-900">{link.clicks.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-rx-gray-400" />
                    <div>
                      <div className="text-xs text-rx-gray-500">Conversions</div>
                      <div className="text-sm font-bold text-rx-gray-900">{link.conversions}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-xs text-rx-gray-500">Rate</div>
                      <div className="text-sm font-bold text-rx-gray-900">{convRate}%</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Link Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Create Link</h3>
              <button onClick={() => setShowCreateDialog(false)} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>
            {createError && <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{createError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Affiliate</label>
                <select
                  value={createForm.affiliateId}
                  onChange={(e) => setCreateForm({ ...createForm, affiliateId: e.target.value })}
                  disabled={dropdownsLoading}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light disabled:opacity-50"
                >
                  <option value="">{dropdownsLoading ? "Loading..." : "Select an affiliate"}</option>
                  {affiliates.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.User?.name || a.referralCode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Program</label>
                <select
                  value={createForm.programId}
                  onChange={(e) => setCreateForm({ ...createForm, programId: e.target.value })}
                  disabled={dropdownsLoading}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light disabled:opacity-50"
                >
                  <option value="">{dropdownsLoading ? "Loading..." : "Select a program"}</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Label</label>
                <input
                  type="text"
                  value={createForm.label}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  placeholder="e.g. Summer Campaign Link"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateDialog(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={createLoading} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50">{createLoading ? "Creating..." : "Create Link"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
