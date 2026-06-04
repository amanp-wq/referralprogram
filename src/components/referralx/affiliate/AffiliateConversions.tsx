"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge } from "../shared";
import {
  ShoppingBag, CheckCircle, Clock, XCircle, Filter, Download,
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

export function AffiliateConversions() {
  const { token } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");

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

  // Compute conversion stats from referrals
  const totalConversions = referrals.length;
  const completed = referrals.filter((r) => r.status === "completed" || r.status === "converted").length;
  const pending = referrals.filter((r) => r.status === "pending").length;
  const refunded = referrals.filter((r) => r.status === "refunded").length;

  // Filter referrals based on active tab
  const filteredReferrals = activeFilter === "All"
    ? referrals
    : referrals.filter((r) => {
        if (activeFilter === "Completed") return r.status === "completed" || r.status === "converted";
        if (activeFilter === "Pending") return r.status === "pending";
        if (activeFilter === "Refunded") return r.status === "refunded";
        return true;
      });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load conversions</h3>
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
            label="Total Conversions"
            value={totalConversions.toLocaleString()}
            iconColor="primary"
            icon={<ShoppingBag className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Completed"
            value={completed.toLocaleString()}
            iconColor="success"
            icon={<CheckCircle className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Pending"
            value={pending.toLocaleString()}
            iconColor="warning"
            icon={<Clock className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Refunded"
            value={refunded.toLocaleString()}
            iconColor="danger"
            icon={<XCircle className="w-[18px] h-[18px]" />}
          />
        </div>
      )}

      {/* Conversions Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <div className="flex gap-1">
            {["All", "Completed", "Pending", "Refunded"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveFilter(t)}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  activeFilter === t
                    ? "bg-rx-primary-light text-rx-primary font-semibold"
                    : "text-rx-gray-500 hover:bg-rx-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50">
              <Filter className="w-3 h-3" /> Filter
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredReferrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Visitor</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Converted At</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredReferrals.map((r) => (
                  <tr key={r.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-semibold text-rx-gray-800">{r.visitorName || "Anonymous"}</div>
                      {r.visitorEmail && <div className="text-xs text-rx-gray-500">{r.visitorEmail}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-700 capitalize">{r.source || "direct"}</td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm text-rx-gray-500">{r.convertedAt ? formatDate(r.convertedAt) : "—"}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status as any} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="w-10 h-10 text-rx-gray-300 mx-auto mb-3" />
            <p className="text-sm text-rx-gray-500">
              {activeFilter === "All"
                ? "No conversions yet. Share your referral link to start earning!"
                : `No ${activeFilter.toLowerCase()} conversions found.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
