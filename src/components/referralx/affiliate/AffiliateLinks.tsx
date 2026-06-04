"use client";
import { StatusBadge, CopyButton } from "../shared";
import { Link2, MousePointer, ShoppingBag, Plus, ExternalLink } from "lucide-react";
const links = [
  { name: "SaaS Promotion", url: "https://referralx.com/ref/johndoe-saas", clicks: 1234, conversions: 67, rate: "5.4%", status: "active" as const },
  { name: "Toolkit Campaign", url: "https://referralx.com/ref/johndoe-toolkit", clicks: 892, conversions: 45, rate: "5.0%", status: "active" as const },
  { name: "Design Offer", url: "https://referralx.com/ref/johndoe-design", clicks: 654, conversions: 32, rate: "4.9%", status: "active" as const },
  { name: "DevOps Course", url: "https://referralx.com/ref/johndoe-devops", clicks: 321, conversions: 18, rate: "5.6%", status: "active" as const },
  { name: "Marketing Pack", url: "https://referralx.com/ref/johndoe-marketing", clicks: 567, conversions: 28, rate: "4.9%", status: "active" as const },
  { name: "API Access", url: "https://referralx.com/ref/johndoe-api", clicks: 234, conversions: 12, rate: "5.1%", status: "inactive" as const },
];
export function AffiliateLinks() {
  return (<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold text-rx-gray-800">My Links</h3><p className="text-sm text-rx-gray-500">Manage and share your referral tracking links</p></div><button className="inline-flex items-center gap-2 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"><Plus className="w-4 h-4"/> Create Link</button></div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{links.map(link=><div key={link.name} className="bg-white rounded-2xl border border-rx-gray-200 p-5 hover:shadow-md transition-shadow"><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-rx-primary-light flex items-center justify-center"><Link2 className="w-4 h-4 text-rx-primary"/></div><h4 className="font-semibold text-rx-gray-800">{link.name}</h4></div><StatusBadge status={link.status}/></div><div className="bg-rx-gray-50 border border-rx-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between mb-4"><span className="text-xs font-mono text-rx-gray-700 truncate mr-2">{link.url}</span><CopyButton text={link.url} label={<ExternalLink className="w-3.5 h-3.5"/>}/></div><div className="flex gap-5"><div className="flex items-center gap-2"><MousePointer className="w-4 h-4 text-rx-gray-400"/><div><div className="text-xs text-rx-gray-500">Clicks</div><div className="text-sm font-bold text-rx-gray-900">{link.clicks.toLocaleString()}</div></div></div><div className="flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-rx-gray-400"/><div><div className="text-xs text-rx-gray-500">Conversions</div><div className="text-sm font-bold text-rx-gray-900">{link.conversions}</div></div></div></div></div>)}</div>
  </div>);
}
