"use client";
import { KpiCard, StatusBadge } from "../shared";
import { DollarSign, TrendingUp, Clock, AlertCircle, Filter, Download } from "lucide-react";
const kpis = [
  { label: "Total Commissions", value: "$24,580", trend: { value: "15.3%", direction: "up" as const }, context: "vs last month", iconColor: "primary" as const, icon: <DollarSign className="w-[18px] h-[18px]" /> },
  { label: "Pending", value: "$3,420", trend: { value: "5.2%", direction: "up" as const }, context: "vs last month", iconColor: "warning" as const, icon: <Clock className="w-[18px] h-[18px]" /> },
  { label: "Paid Out", value: "$18,960", trend: { value: "18.7%", direction: "up" as const }, context: "vs last month", iconColor: "success" as const, icon: <TrendingUp className="w-[18px] h-[18px]" /> },
  { label: "Failed", value: "$320", trend: { value: "2.1%", direction: "down" as const }, context: "vs last month", iconColor: "danger" as const, icon: <AlertCircle className="w-[18px] h-[18px]" /> },
];
const commissions = [
  { affiliate: "Sarah Johnson", program: "Premium SaaS Plan", amount: "$495.00", rate: "20%", date: "May 12, 2026", status: "paid" as const },
  { affiliate: "Mike Chen", program: "Pro Toolkit Bundle", amount: "$285.00", rate: "$15/ref", date: "May 11, 2026", status: "pending" as const },
  { affiliate: "Anna Smith", program: "Design Masterclass", amount: "$198.00", rate: "15%", date: "May 10, 2026", status: "paid" as const },
  { affiliate: "Tom Wilson", program: "Premium SaaS Plan", amount: "$340.00", rate: "20%", date: "May 9, 2026", status: "processing" as const },
  { affiliate: "Lisa Brown", program: "Pro Toolkit Bundle", amount: "$120.00", rate: "$15/ref", date: "May 8, 2026", status: "failed" as const },
];
export function AdminCommissions() {
  return (<div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{kpis.map(k=><KpiCard key={k.label} {...k}/>)}</div>
    <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100"><div className="flex gap-1">{["All","Pending","Paid","Processing","Failed"].map((t,i)=><button key={t} className={`px-4 py-2 text-sm font-medium rounded-lg ${i===0?"bg-rx-primary-light text-rx-primary font-semibold":"text-rx-gray-500 hover:bg-rx-gray-50"}`}>{t}</button>)}</div><div className="flex gap-2"><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3"/> Filter</button><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3"/> Export</button></div></div>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Affiliate</th><th className="px-5 py-3">Program</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{commissions.map((c,i)=><tr key={i} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50"><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-800">{c.affiliate}</td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{c.program}</td><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{c.amount}</td><td className="px-5 py-3.5 text-sm text-rx-gray-500">{c.rate}</td><td className="px-5 py-3.5 text-sm text-rx-gray-500">{c.date}</td><td className="px-5 py-3.5"><StatusBadge status={c.status}/></td></tr>)}</tbody></table></div>
    </div></div>);
}
