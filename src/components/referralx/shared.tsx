"use client";

import { TrendingUp, TrendingDown, Copy, Check } from "lucide-react";
import { useState } from "react";

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

interface StatusBadgeProps {
  status: "active" | "pending" | "inactive" | "paid" | "processing" | "failed" | "completed" | "refunded";
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
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || "bg-rx-gray-100 text-rx-gray-500"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

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

export function Avatar({ initials, className = "" }: { initials: string; className?: string }) {
  return (
    <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${className}`}>{initials}</div>
  );
}

export function ProgressBar({ value, color = "primary" }: { value: number; color?: "primary" | "success" | "warning" | "danger" }) {
  const colorMap = { primary: "bg-rx-primary", success: "bg-rx-secondary", warning: "bg-rx-warning", danger: "bg-rx-danger" };
  return (
    <div className="w-full h-1.5 bg-rx-gray-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${colorMap[color]}`} style={{ width: `${value}%` }} />
    </div>
  );
}

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
