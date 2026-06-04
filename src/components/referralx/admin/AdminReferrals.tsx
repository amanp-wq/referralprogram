"use client";
import { KpiCard, StatusBadge, Avatar } from "../shared";
import { Share2, UserPlus, RefreshCw, ArrowRight, Filter, Download } from "lucide-react";
const kpis = [
  { label: "Total Referrals", value: "8,432", trend: { value: "15.2%", direction: "up" as const }, context: "vs last month", iconColor: "primary" as const, icon: <Share2 className="w-[18px] h-[18px]" /> },
  { label: "New Referrals", value: "342", trend: { value: "8.7%", direction: "up" as const }, context: "this week", iconColor: "success" as const, icon: <UserPlus className="w-[18px] h-[18px]" /> },
  { label: "Conversion Rate", value: "5.4%", trend: { value: "0.3%", direction: "down" as const }, context: "vs last month", iconColor: "warning" as const, icon: <RefreshCw className="w-[18px] h-[18px]" /> },
  { label: "Avg. Time to Convert", value: "2.3d", trend: { value: "0.5d", direction: "up" as const }, context: "faster", iconColor: "danger" as const, icon: <ArrowRight className="w-[18px] h-[18px]" /> },
];
const referrals = [
  { referrer: "Sarah Johnson", referred: "Alex Thompson", program: "Premium SaaS Plan", date: "May 12, 2026", status: "active" as const, commission: "$99.00" },
  { referrer: "Mike Chen", referred: "Jordan Blake", program: "Pro Toolkit Bundle", date: "May 11, 2026", status: "pending" as const, commission: "$49.00" },
  { referrer: "Anna Smith", referred: "Casey Morgan", program: "Design Masterclass", date: "May 10, 2026", status: "active" as const, commission: "$29.00" },
  { referrer: "Tom Wilson", referred: "Riley Cooper", program: "Premium SaaS Plan", date: "May 9, 2026", status: "inactive" as const, commission: "$0.00" },
];
export function AdminReferrals() {
  return (<div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{kpis.map(k=><KpiCard key={k.label} {...k}/>)}</div>
    <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100"><h3 className="text-base font-semibold text-rx-gray-800">Referral List</h3><div className="flex gap-2"><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3"/> Filter</button><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3"/> Export</button></div></div>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Referrer</th><th className="px-5 py-3">Referred</th><th className="px-5 py-3">Program</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Commission</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{referrals.map((r,i)=><tr key={i} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar initials={r.referrer.split(" ").map(n=>n[0]).join("")}/><span className="text-sm font-semibold text-rx-gray-800">{r.referrer}</span></div></td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{r.referred}</td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{r.program}</td><td className="px-5 py-3.5 text-sm text-rx-gray-500">{r.date}</td><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{r.commission}</td><td className="px-5 py-3.5"><StatusBadge status={r.status}/></td></tr>)}</tbody></table></div>
    </div></div>);
}
