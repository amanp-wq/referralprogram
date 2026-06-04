"use client";
import { KpiCard, StatusBadge, Avatar, ProgressBar } from "../shared";
import { Users, UserPlus, UserCheck, UserX, Filter, Download, Search, Plus } from "lucide-react";
const kpis = [
  { label: "Total Affiliates", value: "1,247", trend: { value: "8.3%", direction: "up" as const }, context: "vs last month", iconColor: "primary" as const, icon: <Users className="w-[18px] h-[18px]" /> },
  { label: "Active Affiliates", value: "982", trend: { value: "12.1%", direction: "up" as const }, context: "vs last month", iconColor: "success" as const, icon: <UserCheck className="w-[18px] h-[18px]" /> },
  { label: "New This Month", value: "64", trend: { value: "5.2%", direction: "up" as const }, context: "vs last month", iconColor: "warning" as const, icon: <UserPlus className="w-[18px] h-[18px]" /> },
  { label: "Inactive", value: "201", trend: { value: "3.1%", direction: "down" as const }, context: "vs last month", iconColor: "danger" as const, icon: <UserX className="w-[18px] h-[18px]" /> },
];
const affiliates = [
  { name: "Sarah Johnson", email: "sarah.j@email.com", referrals: 234, revenue: "$4,680", status: "active" as const, progress: 78, joined: "Jan 15, 2026" },
  { name: "Mike Chen", email: "mike.c@email.com", referrals: 189, revenue: "$3,780", status: "active" as const, progress: 63, joined: "Feb 3, 2026" },
  { name: "Anna Smith", email: "anna.s@email.com", referrals: 156, revenue: "$3,120", status: "active" as const, progress: 52, joined: "Mar 12, 2026" },
  { name: "Tom Wilson", email: "tom.w@email.com", referrals: 98, revenue: "$1,960", status: "pending" as const, progress: 33, joined: "Apr 5, 2026" },
  { name: "Lisa Brown", email: "lisa.b@email.com", referrals: 87, revenue: "$1,740", status: "active" as const, progress: 29, joined: "Apr 20, 2026" },
  { name: "David Lee", email: "david.l@email.com", referrals: 45, revenue: "$900", status: "inactive" as const, progress: 15, joined: "May 1, 2026" },
];
export function AdminAffiliates() {
  return (<div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{kpis.map((kpi)=><KpiCard key={kpi.label} {...kpi}/>)}</div>
    <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100"><h3 className="text-base font-semibold text-rx-gray-800">Affiliate List</h3><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400"/><input type="text" placeholder="Search affiliates..." className="pl-9 pr-3 py-1.5 border border-rx-gray-200 rounded-lg text-sm w-[200px] focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"/></div><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3"/> Filter</button><button className="inline-flex items-center gap-1.5 px-3 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"><Plus className="w-3.5 h-3.5"/> Invite</button></div></div>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Affiliate</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Referrals</th><th className="px-5 py-3">Revenue</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{affiliates.map(a=><tr key={a.email} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar initials={a.name.split(" ").map(n=>n[0]).join("")}/><div><div className="text-sm font-semibold text-rx-gray-800">{a.name}</div><div className="text-xs text-rx-gray-500">{a.email}</div></div></div></td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{a.joined}</td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{a.referrals}</td><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{a.revenue}</td><td className="px-5 py-3.5"><ProgressBar value={a.progress} color={a.progress>50?"success":a.progress>25?"primary":"warning"}/></td><td className="px-5 py-3.5"><StatusBadge status={a.status}/></td></tr>)}</tbody></table></div>
    </div>
  </div>);
}
