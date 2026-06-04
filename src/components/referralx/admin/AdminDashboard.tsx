"use client";
import { KpiCard, StatusBadge, Avatar, ProgressBar, SectionCard } from "../shared";
import { DollarSign, MousePointer, ShoppingBag, Percent, Users, Share2, Target, Link2, Zap, Plus, Download, Filter, ArrowRight, TrendingUp } from "lucide-react";

const kpiData = [
  { label: "Total Revenue", value: "$48,250", trend: { value: "12.5%", direction: "up" as const }, context: "vs last month", iconColor: "primary" as const, icon: <DollarSign className="w-[18px] h-[18px]" /> },
  { label: "Active Affiliates", value: "1,247", trend: { value: "8.3%", direction: "up" as const }, context: "vs last month", iconColor: "success" as const, icon: <Users className="w-[18px] h-[18px]" /> },
  { label: "Total Referrals", value: "8,432", trend: { value: "15.2%", direction: "up" as const }, context: "vs last month", iconColor: "warning" as const, icon: <Share2 className="w-[18px] h-[18px]" /> },
  { label: "Conversion Rate", value: "3.8%", trend: { value: "0.5%", direction: "down" as const }, context: "vs last month", iconColor: "danger" as const, icon: <Percent className="w-[18px] h-[18px]" /> },
];
const topAffiliates = [
  { name: "Sarah Johnson", email: "sarah.j@email.com", referrals: 234, revenue: "$4,680", status: "active" as const, progress: 78 },
  { name: "Mike Chen", email: "mike.c@email.com", referrals: 189, revenue: "$3,780", status: "active" as const, progress: 63 },
  { name: "Anna Smith", email: "anna.s@email.com", referrals: 156, revenue: "$3,120", status: "active" as const, progress: 52 },
  { name: "Tom Wilson", email: "tom.w@email.com", referrals: 98, revenue: "$1,960", status: "pending" as const, progress: 33 },
  { name: "Lisa Brown", email: "lisa.b@email.com", referrals: 87, revenue: "$1,740", status: "active" as const, progress: 29 },
];
const programs = [
  { name: "Premium SaaS Plan", type: "Percentage - 20%", affiliates: 45, revenue: "$12,400", color: "bg-rx-primary" },
  { name: "Pro Toolkit Bundle", type: "Fixed - $15/referral", affiliates: 32, revenue: "$8,900", color: "bg-rx-secondary" },
  { name: "Design Masterclass", type: "Percentage - 15%", affiliates: 28, revenue: "$5,200", color: "bg-rx-warning" },
];
const activities = [
  { icon: <Users className="w-3.5 h-3.5" />, color: "bg-rx-secondary-light text-rx-secondary", text: "Sarah Johnson generated 5 new referrals", time: "2 minutes ago" },
  { icon: <DollarSign className="w-3.5 h-3.5" />, color: "bg-rx-primary-light text-rx-primary", text: "Commission of $245.00 earned by Mike Chen", time: "15 minutes ago" },
  { icon: <TrendingUp className="w-3.5 h-3.5" />, color: "bg-rx-warning-light text-rx-warning", text: "Conversion rate increased to 4.2%", time: "1 hour ago" },
  { icon: <Share2 className="w-3.5 h-3.5" />, color: "bg-rx-danger-light text-rx-danger", text: "Payout of $1,200.00 failed for Tom Wilson", time: "3 hours ago" },
  { icon: <Zap className="w-3.5 h-3.5" />, color: "bg-rx-info-light text-rx-info", text: "New affiliate Emma Davis signed up", time: "5 hours ago" },
];
const quickActions = [
  { icon: <Users className="w-5 h-5" />, color: "bg-[#dbeafe] text-[#2563eb]", title: "Invite Affiliate", desc: "Send invitation email" },
  { icon: <Target className="w-5 h-5" />, color: "bg-[#dcfce7] text-[#16a34a]", title: "Create Program", desc: "Set up new campaign" },
  { icon: <Link2 className="w-5 h-5" />, color: "bg-[#f3e8ff] text-[#9333ea]", title: "Generate Link", desc: "Create tracking link" },
  { icon: <Zap className="w-5 h-5" />, color: "bg-[#ffedd5] text-[#ea580c]", title: "Run Report", desc: "Generate analytics" },
];

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{kpiData.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-rx-gray-200 p-5">
          <div className="flex items-center justify-between mb-5"><h3 className="text-base font-semibold text-rx-gray-800">Revenue Trend</h3><div className="flex gap-2">{["7D","30D","90D"].map((p,i)=><button key={p} className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${i===1?"border-rx-primary text-rx-primary bg-rx-primary-light":"border-rx-gray-200 text-rx-gray-600"}`}>{p}</button>)}</div></div>
          <div className="h-[300px] flex items-end gap-2 px-2">{[35,55,45,70,60,80,65,90,75,95,85,70].map((h,i)=><div key={i} className="flex-1 bg-gradient-to-t from-rx-primary to-rx-primary/60 rounded-t-md hover:from-rx-primary-dark hover:to-rx-primary transition-all" style={{height:`${h}%`}}/>)}</div>
          <div className="flex justify-between mt-2 px-2 text-xs text-rx-gray-400">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m=><span key={m}>{m}</span>)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-rx-gray-200 p-5">
          <h3 className="text-base font-semibold text-rx-gray-800 mb-5">Referral Sources</h3>
          <div className="space-y-4">{[{name:"Social Media",value:42,color:"bg-rx-primary"},{name:"Email",value:28,color:"bg-rx-secondary"},{name:"Website",value:18,color:"bg-rx-warning"},{name:"Direct",value:12,color:"bg-rx-info"}].map(s=><div key={s.name}><div className="flex justify-between mb-1.5"><span className="text-sm text-rx-gray-600">{s.name}</span><span className="text-sm font-semibold text-rx-gray-800">{s.value}%</span></div><div className="w-full h-2 bg-rx-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${s.color}`} style={{width:`${s.value}%`}}/></div></div>)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{programs.map(p=><div key={p.name} className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden"><div className={`absolute top-0 left-0 right-0 h-1 ${p.color}`}/><div className="flex justify-between items-start mb-4"><div><h4 className="font-semibold text-rx-gray-800">{p.name}</h4><p className="text-xs text-rx-gray-500 mt-1">{p.type}</p></div></div><div className="grid grid-cols-2 gap-4 mb-4"><div><div className="text-xs text-rx-gray-500">Affiliates</div><div className="text-xl font-bold text-rx-gray-900">{p.affiliates}</div></div><div><div className="text-xs text-rx-gray-500">Revenue</div><div className="text-xl font-bold text-rx-gray-900">{p.revenue}</div></div></div><div className="flex items-center justify-between pt-4 border-t border-rx-gray-100"><div className="flex -space-x-2">{["A","B","C"].map(i=><div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-[#667eea] to-[#764ba2] border-2 border-white flex items-center justify-center text-white text-[10px] font-semibold">{i}</div>)}<div className="w-7 h-7 rounded-full bg-rx-gray-100 border-2 border-white flex items-center justify-center text-rx-gray-600 text-[10px] font-semibold">+{p.affiliates-3}</div></div><span className="text-rx-primary text-[13px] font-semibold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">View <ArrowRight className="w-3 h-3"/></span></div></div>)}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{quickActions.map(a=><div key={a.title} className="bg-white rounded-xl p-4 border border-rx-gray-200 flex items-center gap-3 cursor-pointer hover:border-rx-primary hover:shadow-md hover:-translate-y-0.5 transition-all"><div className={`w-11 h-11 rounded-lg flex items-center justify-center ${a.color}`}>{a.icon}</div><div><div className="text-sm font-semibold text-rx-gray-800">{a.title}</div><div className="text-xs text-rx-gray-500">{a.desc}</div></div></div>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rx-gray-100"><h3 className="text-base font-semibold text-rx-gray-800">Top Affiliates</h3><div className="flex gap-2"><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Filter className="w-3 h-3"/> Filter</button><button className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"><Download className="w-3 h-3"/> Export</button></div></div>
          <div className="overflow-x-auto"><table className="w-full"><thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50"><th className="px-5 py-3">Affiliate</th><th className="px-5 py-3">Referrals</th><th className="px-5 py-3">Revenue</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{topAffiliates.map(a=><tr key={a.name} className="border-b border-rx-gray-100 last:border-0 hover:bg-rx-gray-50"><td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar initials={a.name.split(" ").map(n=>n[0]).join("")}/><div><div className="text-sm font-semibold text-rx-gray-800">{a.name}</div><div className="text-xs text-rx-gray-500">{a.email}</div></div></div></td><td className="px-5 py-3.5 text-sm text-rx-gray-700">{a.referrals}</td><td className="px-5 py-3.5 text-sm font-semibold text-rx-gray-900">{a.revenue}</td><td className="px-5 py-3.5"><ProgressBar value={a.progress} color="primary"/></td><td className="px-5 py-3.5"><StatusBadge status={a.status}/></td></tr>)}</tbody></table></div>
        </div>
        <SectionCard title="Recent Activity"><div className="space-y-4">{activities.map((a,i)=><div key={i} className={`flex gap-3 ${i<activities.length-1?"pb-4 border-b border-rx-gray-100":""}`}><div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>{a.icon}</div><div><div className="text-sm text-rx-gray-700 leading-relaxed">{a.text}</div><div className="text-xs text-rx-gray-400 mt-1">{a.time}</div></div></div>)}</div></SectionCard>
      </div>
    </div>
  );
}
