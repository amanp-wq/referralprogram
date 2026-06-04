"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge, Avatar, CopyButton, getInitials } from "../shared";
import {
  Users, UserPlus, Share2, Copy, Link2,
  RefreshCw, AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function AffiliateReferrals() {
  const { token, affiliate } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const referralLink = affiliate
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${affiliate.referralCode}`
    : "";

  const totalReferrals = referrals.length;
  const activeCount = referrals.filter((r) => r.status === "active" || r.status === "converted" || r.status === "completed").length;
  const convertedCount = referrals.filter((r) => r.status === "converted" || r.status === "completed").length;
  const conversionRate = totalReferrals > 0 ? ((convertedCount / totalReferrals) * 100).toFixed(1) : "0";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            label="Total Referrals"
            value={totalReferrals.toLocaleString()}
            iconColor="primary"
            icon={<Users className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Active"
            value={activeCount.toLocaleString()}
            iconColor="success"
            icon={<UserPlus className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Conversion Rate"
            value={`${conversionRate}%`}
            iconColor="warning"
            icon={<Share2 className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Converted"
            value={convertedCount.toLocaleString()}
            iconColor="danger"
            icon={<Copy className="w-[18px] h-[18px]" />}
          />
        </div>
      )}

      {/* Share Referral Link */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <h3 className="text-base font-semibold text-rx-gray-800 mb-3">Share Your Referral Link</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-4 py-3 border border-rx-gray-200 rounded-lg font-mono text-sm bg-rx-gray-50 text-rx-gray-700"
          />
          <CopyButton text={referralLink} label="Copy Link" />
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Your Referrals</h3>
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
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : referrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Referral</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => {
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
                      <td className="px-5 py-3.5">
                        <StatusBadge status={r.status as any} />
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
            <p className="text-sm text-rx-gray-500">No referrals yet. Share your link to start building your network!</p>
          </div>
        )}
      </div>
    </div>
  );
}
