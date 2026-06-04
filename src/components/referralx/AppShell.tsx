"use client";

import { useState } from "react";
import { getInitials } from "./shared";
import {
  ChartPie, Users, Share2, Target, DollarSign, Wallet, Link2, FileText, Settings,
  ShoppingBag, CreditCard, Receipt, HelpCircle, Search, Bell, LogOut, Menu, X, ChevronRight,
} from "lucide-react";

interface NavGroup { label: string; items: { id: string; label: string; icon: React.ReactNode; badge?: number }[]; }

const adminNavGroups: NavGroup[] = [
  { label: "Main", items: [
    { id: "dashboard", label: "Dashboard", icon: <ChartPie className="w-[18px] h-[18px]" /> },
    { id: "affiliates", label: "Affiliates", icon: <Users className="w-[18px] h-[18px]" />, badge: 3 },
    { id: "referrals", label: "Referrals", icon: <Share2 className="w-[18px] h-[18px]" /> },
    { id: "programs", label: "Programs", icon: <Target className="w-[18px] h-[18px]" /> },
  ]},
  { label: "Finance", items: [
    { id: "commissions", label: "Commissions", icon: <DollarSign className="w-[18px] h-[18px]" /> },
    { id: "payouts", label: "Payouts", icon: <Wallet className="w-[18px] h-[18px]" />, badge: 5 },
  ]},
  { label: "Management", items: [
    { id: "links", label: "Tracking Links", icon: <Link2 className="w-[18px] h-[18px]" /> },
    { id: "reports", label: "Reports", icon: <FileText className="w-[18px] h-[18px]" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-[18px] h-[18px]" /> },
  ]},
];

const affiliateNavGroups: NavGroup[] = [
  { label: "Main", items: [
    { id: "dashboard", label: "Dashboard", icon: <ChartPie className="w-[18px] h-[18px]" /> },
    { id: "links", label: "My Links", icon: <Link2 className="w-[18px] h-[18px]" /> },
    { id: "conversions", label: "Conversions", icon: <ShoppingBag className="w-[18px] h-[18px]" />, badge: 3 },
    { id: "referrals", label: "Referrals", icon: <Users className="w-[18px] h-[18px]" /> },
  ]},
  { label: "Finance", items: [
    { id: "earnings", label: "Earnings", icon: <Wallet className="w-[18px] h-[18px]" /> },
    { id: "payouts", label: "Payouts", icon: <CreditCard className="w-[18px] h-[18px]" /> },
    { id: "invoices", label: "Invoices", icon: <Receipt className="w-[18px] h-[18px]" /> },
  ]},
  { label: "Other", items: [
    { id: "settings", label: "Settings", icon: <Settings className="w-[18px] h-[18px]" /> },
    { id: "help", label: "Help Center", icon: <HelpCircle className="w-[18px] h-[18px]" /> },
  ]},
];

interface AppShellProps {
  role: "admin" | "affiliate"; activePage: string; onPageChange: (page: string) => void;
  pageTitle: string; onLogout: () => void; children: React.ReactNode; userName?: string;
}

export function AppShell({ role, activePage, onPageChange, pageTitle, onLogout, children, userName }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navGroups = role === "admin" ? adminNavGroups : affiliateNavGroups;
  const displayName = userName || (role === "admin" ? "Admin" : "Affiliate");
  const userInfo = role === "admin" 
    ? { name: displayName, role: "Program Manager", initials: getInitials(displayName) } 
    : { name: displayName, role: "Pro Affiliate", initials: getInitials(displayName) };
  const breadcrumbMap: Record<string, string> = {
    dashboard: "Dashboard", affiliates: "Affiliate Management", commissions: "Commission Management",
    referrals: role === "admin" ? "Referral Tracking" : "Referrals", programs: "Campaign Programs",
    links: role === "admin" ? "Link Management" : "My Links", payouts: role === "admin" ? "Payout Processing" : "Payouts",
    reports: "Analytics Reports", settings: role === "admin" ? "System Settings" : "Settings",
    conversions: "Conversions", earnings: "Earnings", invoices: "Invoices", help: "Help Center",
  };

  return (
    <div className="flex min-h-screen bg-rx-gray-50">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed top-0 left-0 h-full z-50 bg-white border-r border-rx-gray-200 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-[72px]" : "w-[260px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-5 border-b border-rx-gray-100 flex items-center gap-3">
          <img src="/logo.svg" alt="ElevateMe" className="h-9 w-auto flex-shrink-0" />
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
              {!sidebarCollapsed && <div className="text-[11px] font-semibold uppercase tracking-wider text-rx-gray-400 px-3 pb-2">{group.label}</div>}
              {group.items.map((item) => (
                <button key={item.id} onClick={() => { onPageChange(item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all relative text-left ${activePage === item.id ? "bg-rx-primary-light text-rx-primary-dark font-semibold" : "text-rx-gray-600 hover:bg-rx-gray-50 hover:text-rx-gray-800"}`}>
                  {activePage === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-rx-primary rounded-r" />}
                  {item.icon}
                  {!sidebarCollapsed && <span className="text-sm whitespace-nowrap">{item.label}</span>}
                  {!sidebarCollapsed && item.badge && <span className="ml-auto bg-rx-danger text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-rx-gray-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-rx-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rx-primary to-rx-primary-dark flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">{userInfo.initials}</div>
            {!sidebarCollapsed && <div><div className="text-sm font-semibold text-rx-gray-800">{userInfo.name}</div><div className="text-xs text-rx-gray-500">{userInfo.role}</div></div>}
          </div>
        </div>
      </aside>
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"}`}>
        <header className="h-16 bg-white border-b border-rx-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => { if (typeof window !== "undefined" && window.innerWidth < 768) setMobileOpen(!mobileOpen); else setSidebarCollapsed(!sidebarCollapsed); }}
              className="w-9 h-9 rounded-lg border border-rx-gray-200 bg-white flex items-center justify-center text-rx-gray-600 hover:bg-rx-gray-50 hover:text-rx-gray-800 transition-colors">
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-rx-gray-900 font-heading">{pageTitle}</h1>
              <div className="flex items-center gap-2 text-[13px] text-rx-gray-500">
                <button onClick={() => onPageChange("dashboard")} className="hover:text-rx-primary transition-colors">Home</button>
                <ChevronRight className="w-3 h-3" />
                <span>{breadcrumbMap[activePage] || pageTitle}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input type="text" placeholder="Search anything..." className="w-[280px] pl-9 pr-3 py-2 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all" />
            </div>
            <button className="w-9 h-9 rounded-lg border border-rx-gray-200 bg-white flex items-center justify-center text-rx-gray-600 hover:bg-rx-gray-50 transition-colors relative">
              <Bell className="w-4 h-4" /><span className="absolute top-2 right-2 w-2 h-2 bg-rx-danger rounded-full border-2 border-white" />
            </button>
            <button onClick={onLogout} className="w-9 h-9 rounded-lg border border-rx-gray-200 bg-white flex items-center justify-center text-rx-gray-600 hover:bg-rx-danger-light hover:text-rx-danger transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <div className="p-6 max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}
