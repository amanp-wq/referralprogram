"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, CopyButton } from "../shared";
import {
  Link2, MousePointer, ShoppingBag, Plus, ExternalLink,
  RefreshCw, AlertCircle, X, Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface AffiliateLink {
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
  updatedAt?: string;
  Program?: { id: string; name: string; slug: string; commissionType: string; commissionValue: number };
}

interface ProgramOption {
  id: string;
  name: string;
  slug: string;
  commissionType: string;
  commissionValue: number;
  isActive: boolean;
}

export function AffiliateLinks() {
  const { token, affiliate } = useAuth();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newProgramId, setNewProgramId] = useState("");

  // Referral link from affiliate code
  const referralLink = affiliate
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${affiliate.referralCode}`
    : "";

  const fetchLinks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/links", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load links");
      }
      const json = await res.json();
      setLinks(json.links || []);
      setPrograms(json.programs || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreateLink = async () => {
    if (!token) return;
    if (!newProgramId) {
      setCreateError("Please select a program for this link");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/affiliate/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          programId: newProgramId,
          label: newLabel || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create link");
      }
      toast({ title: "Link created", description: "Your new referral link is ready to share!" });
      setShowCreateDialog(false);
      setNewLabel("");
      setNewProgramId("");
      fetchLinks();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load links</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchLinks} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary Referral Link Section */}
      <div className="bg-gradient-to-br from-rx-primary to-rx-primary-dark rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <img src="/logo.svg" alt="ElevateMe" className="h-8 w-8" />
          <div>
            <h3 className="text-lg font-bold">Your Unique Referral Link</h3>
            <p className="text-white/70 text-sm">Share this link to start earning commissions</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-3 border border-white/20 rounded-lg font-mono text-sm bg-white/10 text-white placeholder-white/50"
          />
          <button
            onClick={handleCopyReferralLink}
            className="px-5 py-3 bg-white text-rx-primary rounded-lg font-semibold hover:bg-white/90 flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Copy
          </button>
        </div>
        {affiliate && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
            <div>
              <div className="text-white/60 text-xs">Your Code</div>
              <div className="text-white font-bold font-mono">{affiliate.referralCode}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Tier</div>
              <div className="text-white font-bold capitalize">{affiliate.tier}</div>
            </div>
            <div>
              <div className="text-white/60 text-xs">Commission</div>
              <div className="text-white font-bold">{affiliate.commissionRate}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-rx-gray-800">Program-Specific Links</h3>
          <p className="text-sm text-rx-gray-500">Create tracking links for specific programs</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
        >
          <Plus className="w-4 h-4" /> Create Link
        </button>
      </div>

      {/* Create Link Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Create New Link</h3>
              <button onClick={() => { setShowCreateDialog(false); setCreateError(null); }} className="w-8 h-8 rounded-lg hover:bg-rx-gray-100 flex items-center justify-center text-rx-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Program *</label>
                <select
                  value={newProgramId}
                  onChange={(e) => setNewProgramId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                >
                  <option value="">Select a program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.commissionType === "percentage" ? `${p.commissionValue}%` : `$${p.commissionValue}`})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Link Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., SaaS Promotion"
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                />
              </div>
              {createError && (
                <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium">{createError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowCreateDialog(false); setCreateError(null); }}
                  className="flex-1 px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-700 hover:bg-rx-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLink}
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Links Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-rx-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <Skeleton className="h-5 w-28" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg mb-4" />
              <div className="flex gap-5">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : links.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {links.map((link) => (
            <div key={link.id} className="bg-white rounded-2xl border border-rx-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rx-primary-light flex items-center justify-center">
                    <Link2 className="w-4 h-4 text-rx-primary" />
                  </div>
                  <h4 className="font-semibold text-rx-gray-800">{link.label || `Link ${link.code?.slice(-6) || link.id.slice(-6)}`}</h4>
                </div>
                <StatusBadge status={link.isActive ? "active" : "inactive"} />
              </div>
              {link.Program && (
                <div className="text-xs text-rx-gray-500 mb-3">
                  {link.Program.name} &middot; {link.Program.commissionType === "percentage" ? `${link.Program.commissionValue}%` : `$${link.Program.commissionValue}`}
                </div>
              )}
              <div className="bg-rx-gray-50 border border-rx-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-rx-gray-700 truncate mr-2">{link.url}</span>
                <CopyButton text={link.url} label={<ExternalLink className="w-3.5 h-3.5" />} />
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
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-rx-gray-200 p-12 text-center">
          <Link2 className="w-12 h-12 text-rx-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-rx-gray-800 mb-2">No program links yet</h4>
          <p className="text-sm text-rx-gray-500 mb-4">Create program-specific tracking links for detailed analytics.</p>
          <button onClick={() => setShowCreateDialog(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
            <Plus className="w-4 h-4" /> Create Your First Link
          </button>
        </div>
      )}
    </div>
  );
}
