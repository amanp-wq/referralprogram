"use client";
import { KpiCard, StatusBadge, Avatar } from "../shared";
import { Wallet, CheckCircle, Clock, XCircle, Filter, Download, Eye, Check, X } from "lucide-react";
const kpis = [
  { label: "Total Payouts", value: "$18,960", trend: { value: "12.3%", direction: "up" as const }, context: "vs last month", iconColor: "primary" as const, icon: <Wallet className="w-[18px] h-[18px]" /> },
  { label: "Completed", value: "$15,240", trend: { value: "8.5%", direction: "up" as const }, context: "vs last month", iconColor: "success" as const, icon: <CheckCircle className="w-[18px] h-[18px]" /> },
  { label: "Pending", value: "$3,420", trend: { value: "5.2%", direction: "up" as const }, context: "this month", iconColor: "warning" as const, icon: <Clock className="w-[18px] h-[18px]" /> },
  { label: "Failed", value: "$300", trend: { value: "2.1%", direction: "down" as const }, context: "vs last month", iconColor: "danger" as const, icon: <XCircle className="w-[18px] h-[18px]" /> },
];
const payouts = [
  { affiliate: "Sarah Johnson", amount: "$495.00", method: "Bank Transfer", requestDate: "May 12, 2026", processDate: "May 14, 2026", status: "paid" as const },
  { affiliate: "Mike Chen", amount: "$285.00", method: "PayPal", requestDate: "May 11, 2026", processDate: "-", status: "pending" as const },
  { affiliate: "Anna Smith", amount: "$198.00", method: "Bank Transfer", requestDate: "May 10, 2026", processDate: "May 12, 2026", status: "paid" as const },
  { affiliate: "Tom Wilson", amount: "$340.00", method: "PayPal", requestDate: "May 9, 2026", processDate: "-", status: "processing" as const },
  { affiliate: "Lisa Brown", amount: "$120.00", method: "Stripe", requestDate: "May 8, 2026", processDate: "-", status: "failed" as const },
];
export function AdminPayouts() {
  return (<div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{kpis.map(k=><KpiCard key={k.label} {...k}/>)}</div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{[{label:"Next Payout Date",value:"May 15, 2026",sub:"3 pending requests"},{label:"Average Payout",value:"$245.00",sub:"Per affiliate"},{label:"Min. Payout",value:"$50.00",sub:"Configured threshold"}].map(i=><div key={i.label} className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-md transition-shadow"><div className="text-xs text-rx-gray-500 font-medium mb-1">{i.label}</div><div className="text-2xl font-bold text-rx-gray-900 mb-1">{i.value}</div><div className="text-xs text-rx-gray-400">{i.sub}</div></div>)}</div>
    <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100"><h3 className="text-base font-semibold text-rx-gray-800">Payout History</h3><div className="flex gap-2"><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3"/> Filter</button><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3"/> Export</button></div></div>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Affiliate</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Request</th><th className="px-5 py-3">Processed</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Actions</th></tr></thead><tbody>{payouts.map((p,i)=><tr key={i} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar initials={p.affiliate.split(" ").map(n=>n[0]).join("")}/><span className="text-sm font-semibold text-rx-gray-800">{p.affiliate}</span></div></td><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{p.amount}</td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{p.method}</td><td className="px-5 py-3.5 text-sm text-rx-gray-500">{p.requestDate}</td><td className="px-5 py-3.5 text-sm text-rx-gray-500">{p.processDate}</td><td className="px-5 py-3.5"><StatusBadge status={p.status}/></td><td className="px-5 py-3.5"><div className="flex gap-1">{p.status==="pending"&&<><button className="p-1.5 rounded-lg hover:bg-rx-secondary-light text-rx-secondary"><Check className="w-4 h-4"/></button><button className="p-1.5 rounded-lg hover:bg-rx-danger-light text-rx-danger"><X className="w-4 h-4"/></button></>}<button className="p-1.5 rounded-lg hover:bg-rx-gray-100 text-rx-gray-400"><Eye className="w-4 h-4"/></button></div></td></tr>)}</tbody></table></div>
    </div></div>);
}
