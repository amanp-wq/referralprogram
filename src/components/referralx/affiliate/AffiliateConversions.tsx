"use client";
import { KpiCard, StatusBadge } from "../shared";
import { ShoppingBag, CheckCircle, Clock, XCircle, Filter, Download } from "lucide-react";
const kpis = [
  { label: "Total Conversions", value: "1,847", trend: { value: "12.8%", direction: "up" as const }, context: "vs last month", iconColor: "primary" as const, icon: <ShoppingBag className="w-[18px] h-[18px]" /> },
  { label: "Completed", value: "1,592", trend: { value: "15.3%", direction: "up" as const }, context: "vs last month", iconColor: "success" as const, icon: <CheckCircle className="w-[18px] h-[18px]" /> },
  { label: "Pending", value: "218", trend: { value: "5.1%", direction: "up" as const }, context: "this month", iconColor: "warning" as const, icon: <Clock className="w-[18px] h-[18px]" /> },
  { label: "Refunded", value: "37", trend: { value: "2.3%", direction: "down" as const }, context: "vs last month", iconColor: "danger" as const, icon: <XCircle className="w-[18px] h-[18px]" /> },
];
const conversions = [
  { product: "Premium SaaS Plan", customer: "sarah.m@email.com", date: "May 12, 2026", amount: "$99.00", commission: "$19.80", status: "completed" as const },
  { product: "Pro Toolkit Bundle", customer: "mike.dev@email.com", date: "May 11, 2026", amount: "$49.00", commission: "$9.80", status: "completed" as const },
  { product: "Design Masterclass", customer: "anna.design@email.com", date: "May 10, 2026", amount: "$29.00", commission: "$5.80", status: "pending" as const },
  { product: "DevOps Course", customer: "tom.ops@email.com", date: "May 9, 2026", amount: "$199.00", commission: "$39.80", status: "completed" as const },
  { product: "Marketing Templates", customer: "lisa.mkt@email.com", date: "May 8, 2026", amount: "$19.00", commission: "$3.80", status: "refunded" as const },
];
export function AffiliateConversions() {
  return (<div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{kpis.map(k=><KpiCard key={k.label} {...k}/>)}</div>
    <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden"><div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100"><div className="flex gap-1">{["All","Completed","Pending","Refunded"].map((t,i)=><button key={t} className={`px-4 py-2 text-sm font-medium rounded-lg ${i===0?"bg-rx-primary-light text-rx-primary font-semibold":"text-rx-gray-500 hover:bg-rx-gray-50"}`}>{t}</button>)}</div><div className="flex gap-2"><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3"/> Filter</button><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3"/> Export</button></div></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Product</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Commission</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{conversions.map((c,i)=><tr key={i} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50"><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-800">{c.product}</td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{c.customer}</td><td className="px-5 py-3.5 text-sm text-rx-gray-500">{c.date}</td><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{c.amount}</td><td className="px-5 py-3.5 text-sm font-bold text-rx-secondary">{c.commission}</td><td className="px-5 py-3.5"><StatusBadge status={c.status}/></td></tr>)}</tbody></table></div></div>
  </div>);
}
