"use client";
import { KpiCard, StatusBadge, Avatar, CopyButton } from "../shared";
import { Users, UserPlus, Share2, Copy } from "lucide-react";
const kpis = [
  { label: "Total Referrals", value: "342", trend: { value: "15.2%", direction: "up" as const }, context: "vs last month", iconColor: "primary" as const, icon: <Users className="w-[18px] h-[18px]" /> },
  { label: "Active", value: "287", trend: { value: "12.8%", direction: "up" as const }, context: "vs last month", iconColor: "success" as const, icon: <UserPlus className="w-[18px] h-[18px]" /> },
  { label: "Conversion Rate", value: "5.4%", trend: { value: "0.3%", direction: "down" as const }, context: "vs last month", iconColor: "warning" as const, icon: <Share2 className="w-[18px] h-[18px]" /> },
  { label: "Earnings", value: "$4,230", trend: { value: "18.5%", direction: "up" as const }, context: "vs last month", iconColor: "danger" as const, icon: <Copy className="w-[18px] h-[18px]" /> },
];
const referrals = [
  { name: "Alex Thompson", email: "alex.t@email.com", date: "May 12, 2026", conversions: 3, earnings: "$147.00", status: "active" as const },
  { name: "Jordan Blake", email: "jordan.b@email.com", date: "May 11, 2026", conversions: 1, earnings: "$49.00", status: "active" as const },
  { name: "Casey Morgan", email: "casey.m@email.com", date: "May 10, 2026", conversions: 2, earnings: "$58.00", status: "active" as const },
  { name: "Riley Cooper", email: "riley.c@email.com", date: "May 9, 2026", conversions: 0, earnings: "$0.00", status: "inactive" as const },
  { name: "Taylor Hayes", email: "taylor.h@email.com", date: "May 8, 2026", conversions: 1, earnings: "$49.00", status: "pending" as const },
];
export function AffiliateReferrals() {
  return (<div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{kpis.map(k=><KpiCard key={k.label} {...k}/>)}</div>
    <div className="bg-white rounded-2xl p-6 border border-rx-gray-200"><h3 className="text-base font-semibold text-rx-gray-800 mb-3">Share Your Referral Link</h3><div className="flex gap-3"><input type="text" value="https://referralx.com/ref/johndoe-pro-2024" readOnly className="flex-1 px-4 py-3 border border-rx-gray-200 rounded-lg font-mono text-sm bg-rx-gray-50 text-rx-gray-700"/><CopyButton text="https://referralx.com/ref/johndoe-pro-2024" label="Copy Link"/></div></div>
    <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden"><div className="px-5 py-4 border-b border-rx-gray-100"><h3 className="text-base font-semibold text-rx-gray-800">Your Referrals</h3></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Referral</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Conversions</th><th className="px-5 py-3">Earnings</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{referrals.map((r,i)=><tr key={i} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar initials={r.name.split(" ").map(n=>n[0]).join("")}/><div><div className="text-sm font-semibold text-rx-gray-800">{r.name}</div><div className="text-xs text-rx-gray-500">{r.email}</div></div></div></td><td className="px-5 py-3.5 text-sm text-rx-gray-500">{r.date}</td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{r.conversions}</td><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{r.earnings}</td><td className="px-5 py-3.5"><StatusBadge status={r.status}/></td></tr>)}</tbody></table></div></div>
  </div>);
}
