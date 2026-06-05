"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, CopyButton, ErrorWithRetry, EmptyState, TableSkeleton, Avatar, getInitials } from "../shared";
import { Link2, MousePointer, ExternalLink, RefreshCw, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AmbassadorLink {
  id: string;
  affiliateId: string;
  referralCode: string;
  ambassadorName: string;
  ambassadorEmail: string;
  ambassadorPhone?: string;
  uniqueLink: string;
  clicks: number;
  enrolled: number;
  conversionRate: string;
  status: string;
}

interface LinksResponse {
  links: AmbassadorLink[];
}

// Helper to transform API link data into per-ambassador format
interface ApiLinkItem {
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
  Affiliate?: { id: string; referralCode: string; User?: { name: string; email: string; phone?: string } };
  Program?: { id: string; name: string; slug: string };
}

export function AdminLinks() {
  const { token } = useAuth();
  const [ambassadorLinks, setAmbassadorLinks] = useState<AmbassadorLink[]>([]);
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

      // Group links by affiliate and pick the main one per ambassador
      const apiLinks: ApiLinkItem[] = json.links || [];
      const ambassadorMap = new Map<string, AmbassadorLink>();

      for (const link of apiLinks) {
        const affId = link.affiliateId;
        if (!ambassadorMap.has(affId)) {
          const name = link.Affiliate?.User?.name || link.Affiliate?.referralCode || "Unknown";
          const email = link.Affiliate?.User?.email || "";
          const phone = link.Affiliate?.User?.phone || "";
          const referralCode = link.Affiliate?.referralCode || link.code || "";
          const convRate = link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : "0.0";

          ambassadorMap.set(affId, {
            id: link.id,
            affiliateId: affId,
            referralCode,
            ambassadorName: name,
            ambassadorEmail: email,
            ambassadorPhone: phone,
            uniqueLink: `/ref/${referralCode}`,
            clicks: link.clicks,
            enrolled: link.conversions,
            conversionRate: convRate,
            status: link.isActive ? "active" : "inactive",
          });
        } else {
          // Sum up clicks and conversions for this ambassador
          const existing = ambassadorMap.get(affId)!;
          existing.clicks += link.clicks;
          existing.enrolled += link.conversions;
          existing.conversionRate = existing.clicks > 0 ? ((existing.enrolled / existing.clicks) * 100).toFixed(1) : "0.0";
          if (!existing.status || existing.status === "inactive") {
            existing.status = link.isActive ? "active" : "inactive";
          }
        }
      }

      setAmbassadorLinks(Array.from(ambassadorMap.values()));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-rx-gray-800">Tracking Links</h3>
          <p className="text-sm text-rx-gray-500">Main referral link per ambassador</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 border border-rx-gray-200 rounded-lg text-sm text-rx-gray-600 hover:bg-rx-gray-50"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : ambassadorLinks.length === 0 ? (
        <EmptyState title="No tracking links yet" description="Links will appear here once ambassadors are created" />
      ) : (
        <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Ambassador</th>
                  <th className="px-5 py-3">Unique Link</th>
                  <th className="px-5 py-3">Clicks</th>
                  <th className="px-5 py-3">Enrolled</th>
                  <th className="px-5 py-3">Conversion Rate</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ambassadorLinks.map((link) => {
                  const initials = getInitials(link.ambassadorName);
                  return (
                    <tr key={link.affiliateId} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar initials={initials} />
                          <div>
                            <div className="text-sm font-semibold text-rx-gray-800">{link.ambassadorName}</div>
                            <div className="text-xs text-rx-gray-500">{link.ambassadorEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-rx-gray-100 px-2 py-0.5 rounded">{link.uniqueLink}</span>
                          <CopyButton text={`${typeof window !== "undefined" ? window.location.origin : ""}${link.uniqueLink}`} label={<ExternalLink className="w-3.5 h-3.5" />} />
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <MousePointer className="w-4 h-4 text-rx-gray-400" />
                          <span className="text-sm text-rx-gray-700">{link.clicks.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-rx-gray-700">{link.enrolled}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-rx-gray-800">{link.conversionRate}%</span>
                          <div className="w-16 h-1.5 bg-rx-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-rx-primary" style={{ width: `${Math.min(100, parseFloat(link.conversionRate))}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={link.status as any} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
