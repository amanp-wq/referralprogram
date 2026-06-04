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

export function AdminLinks() {
  const { token } = useAuth();
  const [data, setData] = useState<LinksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
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
    </div>
  );
}
