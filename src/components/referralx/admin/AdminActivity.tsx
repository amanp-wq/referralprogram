"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, Avatar, ErrorWithRetry, EmptyState, TableSkeleton, formatDate, timeAgo, getInitials } from "../shared";
import {
  RefreshCw, Download, Users, DollarSign, Share2, Zap, TrendingUp,
  Eye, Filter, Activity as ActivityIcon, CheckCircle2, AlertTriangle, Send,
  ExternalLink, ArrowRightLeft, Trash2, Plus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

const actionMeta: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  created_affiliate: { icon: <Users className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary", label: "Affiliate Created" },
  created: { icon: <Plus className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary", label: "Created" },
  status_changed: { icon: <ArrowRightLeft className="w-3.5 h-3.5" />, color: "bg-rx-warning-light text-rx-warning", label: "Status Changed" },
  referral_submitted: { icon: <Send className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-600", label: "Referral Submitted" },
  referral_click: { icon: <ExternalLink className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info", label: "Link Opened" },
  deleted: { icon: <Trash2 className="w-3.5 h-3.5" />, color: "bg-rx-danger-light text-rx-danger", label: "Deleted" },
  conversion: { icon: <TrendingUp className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary", label: "Conversion" },
  status_changed_enrolled: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary", label: "Enrolled" },
  status_changed_other: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "bg-amber-100 text-amber-600", label: "Status Changed" },
  created_payout: { icon: <DollarSign className="w-3.5 h-3.5" />, color: "bg-rx-primary-light text-rx-primary", label: "Payout Created" },
  default: { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info", label: "Activity" },
};

function getActionMeta(action: string, details?: string) {
  // Check for specific action patterns
  if (action === "referral_submitted") return actionMeta.referral_submitted;
  if (action === "referral_click") return actionMeta.referral_click;
  if (action === "status_changed") {
    const isEnrolled = details?.toLowerCase().includes("enrolled");
    return isEnrolled ? actionMeta.status_changed_enrolled : actionMeta.status_changed_other;
  }
  if (action === "created_affiliate") return actionMeta.created_affiliate;
  if (action === "created") return actionMeta.created;
  if (action === "deleted") return actionMeta.deleted;
  if (action === "conversion") return actionMeta.conversion;
  if (action === "created_payout") return actionMeta.created_payout;

  // Fallback: try to match by key
  for (const [key, val] of Object.entries(actionMeta)) {
    if (action.includes(key) || key === action) return val;
  }
  return actionMeta.default;
}

const entityColors: Record<string, string> = {
  referral: "bg-rx-primary-light text-rx-primary",
  affiliate: "bg-rx-secondary-light text-rx-secondary",
  commission: "bg-rx-warning-light text-rx-warning",
  payout: "bg-rx-info-light text-rx-info",
  link: "bg-rx-gray-100 text-rx-gray-600",
  user: "bg-rx-primary-light text-rx-primary",
};

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

export function AdminActivity() {
  const { token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      const res = await fetch(`/api/admin/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load activities");
      }
      const json = await res.json();
      setActivities(json.activities || []);
    } catch (err: any) {
      setError(err.message || "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }, [token, limit]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  // Apply filters client-side
  const filteredActivities = activities.filter((a) => {
    if (entityFilter && a.entity !== entityFilter) return false;
    if (actionFilter && !a.action.includes(actionFilter)) return false;
    return true;
  });

  // Count by entity
  const entityCounts = activities.reduce((acc: Record<string, number>, a) => {
    acc[a.entity] = (acc[a.entity] || 0) + 1;
    return acc;
  }, {});

  // Count by action type
  const actionCounts = activities.reduce((acc: Record<string, number>, a) => {
    const meta = getActionMeta(a.action, a.details);
    acc[meta.label] = (acc[meta.label] || 0) + 1;
    return acc;
  }, {});

  const handleExport = () => {
    const headers = ["Date", "Action", "Entity", "Entity ID", "Details"];
    const rows = filteredActivities.map((a) => [
      `"${formatDate(a.createdAt)}"`,
      a.action,
      a.entity,
      a.entityId.substring(0, 8),
      `"${(a.details || "").replace(/"/g, '""')}"`,
    ]);
    downloadCSV("activity-log.csv", headers, rows);
    toast({ title: "Export complete", description: "Activity log CSV downloaded." });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rx-primary-light flex items-center justify-center">
              <ActivityIcon className="w-4 h-4 text-rx-primary" />
            </div>
            <span className="text-xs font-medium text-rx-gray-500">Total Activities</span>
          </div>
          <p className="text-2xl font-bold text-rx-gray-900">{activities.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rx-secondary-light flex items-center justify-center">
              <Send className="w-4 h-4 text-rx-secondary" />
            </div>
            <span className="text-xs font-medium text-rx-gray-500">Referrals</span>
          </div>
          <p className="text-2xl font-bold text-rx-gray-900">{entityCounts["referral"] || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rx-warning-light flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-rx-warning" />
            </div>
            <span className="text-xs font-medium text-rx-gray-500">Commissions</span>
          </div>
          <p className="text-2xl font-bold text-rx-gray-900">{entityCounts["commission"] || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-rx-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rx-info-light flex items-center justify-center">
              <Users className="w-4 h-4 text-rx-info" />
            </div>
            <span className="text-xs font-medium text-rx-gray-500">Affiliates</span>
          </div>
          <p className="text-2xl font-bold text-rx-gray-900">{entityCounts["affiliate"] || 0}</p>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">Activity Log</h3>
          <div className="flex gap-2 flex-wrap">
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 bg-white hover:bg-rx-gray-50"
            >
              <option value="">All Entities</option>
              <option value="referral">Referrals</option>
              <option value="affiliate">Affiliates</option>
              <option value="commission">Commissions</option>
              <option value="payout">Payouts</option>
              <option value="link">Links</option>
              <option value="user">Users</option>
            </select>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 bg-white hover:bg-rx-gray-50"
            >
              <option value="">All Actions</option>
              <option value="referral_submitted">Submitted</option>
              <option value="referral_click">Link Opened</option>
              <option value="status_changed">Status Changed</option>
              <option value="created">Created</option>
              <option value="deleted">Deleted</option>
            </select>
            <select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 bg-white hover:bg-rx-gray-50"
            >
              <option value="20">Last 20</option>
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
            </select>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
            >
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : filteredActivities.length === 0 ? (
          <EmptyState title="No activity found" description={entityFilter || actionFilter ? "Try adjusting your filters" : "Activity will appear here as actions occur in the system"} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((a, i) => {
                  const meta = getActionMeta(a.action, a.details);
                  const entityColor = entityColors[a.entity] || "bg-rx-gray-100 text-rx-gray-600";
                  return (
                    <tr key={a.id} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                            {meta.icon}
                          </div>
                          <span className="text-sm font-medium text-rx-gray-800">{meta.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${entityColor}`}>
                          {a.entity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-rx-gray-700 max-w-md truncate" title={a.details || a.action}>
                          {a.details || a.action}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-rx-gray-500">{timeAgo(a.createdAt)}</div>
                        <div className="text-xs text-rx-gray-400">{formatDate(a.createdAt)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
