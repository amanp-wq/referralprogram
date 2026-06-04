"use client";

import { TrendingUp, TrendingDown, Copy, Check, RefreshCw } from "lucide-react";
import { useState } from "react";

/* ─── KpiCard ─── */
interface KpiCardProps {
  label: string;
  value: string;
  trend?: { value: string; direction: "up" | "down" };
  context?: string;
  iconColor: "primary" | "success" | "warning" | "danger" | "info";
  icon: React.ReactNode;
  delay?: number;
}

export function KpiCard({ label, value, trend, context, iconColor, icon }: KpiCardProps) {
  const colorMap = {
    primary: "bg-rx-primary-light text-rx-primary",
    success: "bg-rx-secondary-light text-rx-secondary",
    warning: "bg-rx-warning-light text-rx-warning",
    danger: "bg-rx-danger-light text-rx-danger",
    info: "bg-rx-info-light text-rx-info",
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-rx-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[13px] font-medium text-rx-gray-500">{label}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorMap[iconColor]}`}>{icon}</div>
      </div>
      <div className="text-[28px] font-bold text-rx-gray-900 mb-2 tracking-tight">{value}</div>
      <div className="flex items-center gap-2 text-[13px]">
        {trend && (
          <span className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded text-xs ${
            trend.direction === "up" ? "text-rx-secondary bg-rx-secondary-light" : "text-rx-danger bg-rx-danger-light"
          }`}>
            {trend.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
        {context && <span className="text-rx-gray-500">{context}</span>}
      </div>
    </div>
  );
}

/* ─── KpiCardSkeleton ─── */
export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-rx-gray-200 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 w-24 bg-rx-gray-200 rounded" />
        <div className="h-10 w-10 bg-rx-gray-200 rounded-lg" />
      </div>
      <div className="h-8 w-28 bg-rx-gray-200 rounded mb-2" />
      <div className="h-4 w-32 bg-rx-gray-100 rounded" />
    </div>
  );
}

/* ─── StatusBadge ─── */
type StatusType = "active" | "pending" | "inactive" | "paid" | "processing" | "failed" | "completed" | "refunded" | "suspended" | "cancelled";

interface StatusBadgeProps {
  status: StatusType;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    active: "bg-rx-secondary-light text-rx-secondary",
    pending: "bg-rx-warning-light text-rx-warning",
    inactive: "bg-rx-gray-100 text-rx-gray-500",
    paid: "bg-rx-secondary-light text-rx-secondary",
    processing: "bg-rx-info-light text-rx-info",
    failed: "bg-rx-danger-light text-rx-danger",
    completed: "bg-rx-secondary-light text-rx-secondary",
    refunded: "bg-rx-primary-light text-rx-primary",
    suspended: "bg-rx-warning-light text-rx-warning",
    cancelled: "bg-rx-gray-100 text-rx-gray-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || "bg-rx-gray-100 text-rx-gray-500"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

/* ─── CopyButton ─── */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${copied ? "bg-rx-secondary text-white" : "bg-rx-primary text-white hover:bg-rx-primary-dark"}`}>
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied!" : label}
    </button>
  );
}

/* ─── Avatar ─── */
interface AvatarProps {
  initials?: string;
  className?: string;
  src?: string;
  alt?: string;
  useLogo?: boolean;
}

export function Avatar({ initials, className = "", src, alt, useLogo }: AvatarProps) {
  if (useLogo) {
    return (
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-rx-primary to-rx-primary-dark flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}>
        <img src="/logo.svg" alt="ElevateMe" className="w-6 h-6 object-contain brightness-0 invert" />
      </div>
    );
  }

  if (src) {
    return (
      <div className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ${className}`}>
        <img src={src} alt={alt || "Avatar"} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-rx-primary to-rx-primary-dark flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${className}`}>{initials}</div>
  );
}

/* ─── ProgressBar ─── */
export function ProgressBar({ value, color = "primary" }: { value: number; color?: "primary" | "success" | "warning" | "danger" }) {
  const colorMap = { primary: "bg-rx-primary", success: "bg-rx-secondary", warning: "bg-rx-warning", danger: "bg-rx-danger" };
  return (
    <div className="w-full h-1.5 bg-rx-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorMap[color]}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ─── SectionCard ─── */
export function SectionCard({ title, actions, children, className = "" }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-rx-gray-200 overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100">
          <h3 className="text-base font-semibold text-rx-gray-800">{title}</h3>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ─── ErrorWithRetry ─── */
export function ErrorWithRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-rx-danger-light flex items-center justify-center mb-4">
        <span className="text-rx-danger text-xl">!</span>
      </div>
      <p className="text-sm text-rx-gray-600 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}

/* ─── EmptyState ─── */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-rx-gray-100 flex items-center justify-center mb-4">
        <img src="/logo.svg" alt="ElevateMe" className="w-8 h-8 object-contain opacity-30" />
      </div>
      <p className="text-sm font-semibold text-rx-gray-700 mb-1">{title}</p>
      {description && <p className="text-xs text-rx-gray-500">{description}</p>}
    </div>
  );
}

/* ─── TableSkeleton ─── */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-rx-gray-50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-5 py-3"><div className="h-3 w-20 bg-rx-gray-200 rounded animate-pulse" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-rx-gray-100">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-5 py-3.5">
                  <div className="h-4 bg-rx-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── CardSkeleton ─── */
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-rx-gray-200 animate-pulse">
      <div className="h-4 w-32 bg-rx-gray-200 rounded mb-3" />
      <div className="h-3 w-48 bg-rx-gray-100 rounded mb-4" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div><div className="h-3 w-16 bg-rx-gray-100 rounded mb-2" /><div className="h-6 w-20 bg-rx-gray-200 rounded" /></div>
        <div><div className="h-3 w-16 bg-rx-gray-100 rounded mb-2" /><div className="h-6 w-20 bg-rx-gray-200 rounded" /></div>
      </div>
      <div className="h-8 w-full bg-rx-gray-100 rounded" />
    </div>
  );
}

/* ─── Helpers ─── */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase() || "U";
}

export function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "-";
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "-";
  }
}

export function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return "-";
  }
}
