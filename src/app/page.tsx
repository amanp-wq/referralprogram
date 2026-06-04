"use client";

import { useState } from "react";
import { AdminDashboard } from "@/components/referralx/admin/AdminDashboard";
import { AdminAffiliates } from "@/components/referralx/admin/AdminAffiliates";
import { AdminCommissions } from "@/components/referralx/admin/AdminCommissions";
import { AdminReferrals } from "@/components/referralx/admin/AdminReferrals";
import { AdminPrograms } from "@/components/referralx/admin/AdminPrograms";
import { AdminLinks } from "@/components/referralx/admin/AdminLinks";
import { AdminPayouts } from "@/components/referralx/admin/AdminPayouts";
import { AdminReports } from "@/components/referralx/admin/AdminReports";
import { AdminSettings } from "@/components/referralx/admin/AdminSettings";
import { AffiliateDashboard } from "@/components/referralx/affiliate/AffiliateDashboard";
import { AffiliateLinks } from "@/components/referralx/affiliate/AffiliateLinks";
import { AffiliateConversions } from "@/components/referralx/affiliate/AffiliateConversions";
import { AffiliateReferrals } from "@/components/referralx/affiliate/AffiliateReferrals";
import { AffiliateEarnings } from "@/components/referralx/affiliate/AffiliateEarnings";
import { AffiliatePayouts } from "@/components/referralx/affiliate/AffiliatePayouts";
import { AffiliateInvoices } from "@/components/referralx/affiliate/AffiliateInvoices";
import { AffiliateSettings } from "@/components/referralx/affiliate/AffiliateSettings";
import { AffiliateHelp } from "@/components/referralx/affiliate/AffiliateHelp";
import { AppShell } from "@/components/referralx/AppShell";
import { Users, Target, BarChart3, Zap, Shield, ArrowRight } from "lucide-react";

type Role = "none" | "admin" | "affiliate";
type AdminPage = "dashboard" | "affiliates" | "commissions" | "referrals" | "programs" | "links" | "payouts" | "reports" | "settings";
type AffiliatePage = "dashboard" | "links" | "conversions" | "referrals" | "earnings" | "payouts" | "invoices" | "settings" | "help";

export default function Home() {
  const [role, setRole] = useState<Role>("none");
  const [adminPage, setAdminPage] = useState<AdminPage>("dashboard");
  const [affiliatePage, setAffiliatePage] = useState<AffiliatePage>("dashboard");

  if (role === "admin") {
    const renderPage = () => {
      switch (adminPage) {
        case "dashboard": return <AdminDashboard />;
        case "affiliates": return <AdminAffiliates />;
        case "commissions": return <AdminCommissions />;
        case "referrals": return <AdminReferrals />;
        case "programs": return <AdminPrograms />;
        case "links": return <AdminLinks />;
        case "payouts": return <AdminPayouts />;
        case "reports": return <AdminReports />;
        case "settings": return <AdminSettings />;
      }
    };
    const pageTitles: Record<AdminPage, string> = { dashboard:"Dashboard", affiliates:"Affiliates", commissions:"Commissions", referrals:"Referrals", programs:"Programs", links:"Tracking Links", payouts:"Payouts", reports:"Reports", settings:"Settings" };
    return <AppShell role="admin" activePage={adminPage} onPageChange={(p) => setAdminPage(p as AdminPage)} pageTitle={pageTitles[adminPage]} onLogout={() => setRole("none")}>{renderPage()}</AppShell>;
  }

  if (role === "affiliate") {
    const renderPage = () => {
      switch (affiliatePage) {
        case "dashboard": return <AffiliateDashboard />;
        case "links": return <AffiliateLinks />;
        case "conversions": return <AffiliateConversions />;
        case "referrals": return <AffiliateReferrals />;
        case "earnings": return <AffiliateEarnings />;
        case "payouts": return <AffiliatePayouts />;
        case "invoices": return <AffiliateInvoices />;
        case "settings": return <AffiliateSettings />;
        case "help": return <AffiliateHelp />;
      }
    };
    const pageTitles: Record<AffiliatePage, string> = { dashboard:"Dashboard", links:"My Links", conversions:"Conversions", referrals:"Referrals", earnings:"Earnings", payouts:"Payouts", invoices:"Invoices", settings:"Settings", help:"Help Center" };
    return <AppShell role="affiliate" activePage={affiliatePage} onPageChange={(p) => setAffiliatePage(p as AffiliatePage)} pageTitle={pageTitles[affiliatePage]} onLogout={() => setRole("none")}>{renderPage()}</AppShell>;
  }

  return (
    <div className="min-h-screen bg-rx-gray-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-rx-primary via-rx-primary-dark to-[#3730a3]">
        <div className="absolute inset-0 opacity-10"><div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"/><div className="absolute bottom-20 right-20 w-96 h-96 bg-rx-secondary rounded-full blur-3xl"/></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6"><Zap className="w-4 h-4 text-rx-warning"/><span className="text-white/90 text-sm font-medium">Referral Program Platform</span></div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">Referral<span className="text-rx-secondary">X</span></h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">The complete referral program management platform. Track affiliates, manage commissions, and grow your business through the power of referrals.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <button onClick={() => setRole("admin")} className="group bg-white rounded-2xl p-8 text-left shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-rx-primary/20">
              <div className="flex items-center gap-4 mb-6"><div className="w-14 h-14 rounded-xl bg-rx-primary-light flex items-center justify-center"><Shield className="w-7 h-7 text-rx-primary"/></div><div><h3 className="text-2xl font-bold text-rx-gray-900">Admin Portal</h3><p className="text-rx-gray-500 text-sm">Program Manager</p></div></div>
              <p className="text-rx-gray-600 mb-6 leading-relaxed">Manage your referral programs, oversee affiliates, track commissions, process payouts, and analyze performance reports.</p>
              <div className="flex flex-wrap gap-2 mb-6">{["Dashboard","Affiliates","Programs","Commissions","Reports"].map(f=><span key={f} className="text-xs bg-rx-gray-100 text-rx-gray-600 px-3 py-1 rounded-full font-medium">{f}</span>)}</div>
              <div className="flex items-center gap-2 text-rx-primary font-semibold group-hover:gap-3 transition-all">Enter Admin Portal <ArrowRight className="w-4 h-4"/></div>
            </button>
            <button onClick={() => setRole("affiliate")} className="group bg-white rounded-2xl p-8 text-left shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-rx-secondary/20">
              <div className="flex items-center gap-4 mb-6"><div className="w-14 h-14 rounded-xl bg-rx-secondary-light flex items-center justify-center"><Users className="w-7 h-7 text-rx-secondary"/></div><div><h3 className="text-2xl font-bold text-rx-gray-900">Affiliate Portal</h3><p className="text-rx-gray-500 text-sm">Pro Affiliate</p></div></div>
              <p className="text-rx-gray-600 mb-6 leading-relaxed">Track your referral links, monitor conversions, view earnings, manage payouts, and access your affiliate resources.</p>
              <div className="flex flex-wrap gap-2 mb-6">{["Dashboard","My Links","Conversions","Earnings","Help"].map(f=><span key={f} className="text-xs bg-rx-gray-100 text-rx-gray-600 px-3 py-1 rounded-full font-medium">{f}</span>)}</div>
              <div className="flex items-center gap-2 text-rx-secondary font-semibold group-hover:gap-3 transition-all">Enter Affiliate Portal <ArrowRight className="w-4 h-4"/></div>
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16"><h2 className="text-3xl font-bold text-rx-gray-900 mb-4">Everything You Need</h2><p className="text-rx-gray-500 text-lg max-w-2xl mx-auto">A complete platform to launch, manage, and scale your referral programs</p></div>
        <div className="grid md:grid-cols-3 gap-8">{[{icon:Target,title:"Smart Tracking",desc:"Real-time tracking of referrals, clicks, and conversions with detailed analytics.",color:"bg-rx-primary-light text-rx-primary"},{icon:BarChart3,title:"Powerful Analytics",desc:"Comprehensive reports and insights to optimize your referral program performance.",color:"bg-rx-secondary-light text-rx-secondary"},{icon:Zap,title:"Instant Payouts",desc:"Automated commission calculations and flexible payout options for your affiliates.",color:"bg-rx-warning-light text-rx-warning"}].map((feature,i)=><div key={i} className="bg-white rounded-xl p-8 border border-rx-gray-200 hover:shadow-lg transition-shadow"><div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}><feature.icon className="w-6 h-6"/></div><h3 className="text-lg font-semibold text-rx-gray-900 mb-2">{feature.title}</h3><p className="text-rx-gray-500 leading-relaxed">{feature.desc}</p></div>)}</div>
      </div>
      <footer className="bg-white border-t border-rx-gray-200 py-8"><div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rx-primary to-rx-primary-dark flex items-center justify-center text-white font-bold text-sm">R</div><span className="font-bold text-rx-gray-900 text-lg">ReferralX</span></div><p className="text-rx-gray-500 text-sm">&copy; 2026 ReferralX. All rights reserved.</p></div></footer>
    </div>
  );
}
