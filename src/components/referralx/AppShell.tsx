"use client";

import { useState, useEffect, useRef } from "react";
import { getInitials } from "./shared";
import {
  ChartPie, Users, Share2, DollarSign, Link2, FileText, Settings,
  HelpCircle, Bell, LogOut, Menu, X, ChevronRight, UserCircle, ShieldCheck,
  UserPlus, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhone } from "@/lib/utils";

interface NavGroup {
  label: string;
  items: {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[];
}

const adminNavGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <ChartPie className="w-[18px] h-[18px]" /> },
      { id: "affiliates", label: "Ambassadors", icon: <Users className="w-[18px] h-[18px]" />, badge: 3 },
      { id: "referrals", label: "Referrals", icon: <Share2 className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "commissions", label: "Bonuses", icon: <DollarSign className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "links", label: "Tracking Links", icon: <Link2 className="w-[18px] h-[18px]" /> },
      { id: "activity", label: "Activity Log", icon: <FileText className="w-[18px] h-[18px]" /> },
      { id: "admins", label: "Admin Users", icon: <ShieldCheck className="w-[18px] h-[18px]" /> },
      { id: "reports", label: "Reports", icon: <FileText className="w-[18px] h-[18px]" /> },
      { id: "settings", label: "Settings", icon: <Settings className="w-[18px] h-[18px]" /> },
    ],
  },
];

const affiliateNavGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <ChartPie className="w-[18px] h-[18px]" /> },
      { id: "links", label: "My Links", icon: <Link2 className="w-[18px] h-[18px]" /> },
      { id: "referrals", label: "Referrals", icon: <Users className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "earnings", label: "Earnings", icon: <DollarSign className="w-[18px] h-[18px]" /> },
    ],
  },
  {
    label: "Other",
    items: [
      { id: "settings", label: "Settings", icon: <Settings className="w-[18px] h-[18px]" /> },
      { id: "help", label: "Help Center", icon: <HelpCircle className="w-[18px] h-[18px]" /> },
    ],
  },
];

interface AppShellProps {
  role: "admin" | "affiliate";
  activePage: string;
  onPageChange: (page: string) => void;
  pageTitle: string;
  onLogout: () => void;
  children: React.ReactNode;
  userName?: string;
  referralCount?: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export function AppShell({
  role,
  activePage,
  onPageChange,
  pageTitle,
  onLogout,
  children,
  userName,
  referralCount,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Notification dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navGroups = role === "admin" ? adminNavGroups : affiliateNavGroups;
  const displayName = userName || (role === "admin" ? "Admin" : "Ambassador");
  const userInfo = {
    name: displayName,
    role: role === "admin" ? "Program Manager" : "Pro Ambassador",
    initials: getInitials(displayName),
  };
  const breadcrumbMap: Record<string, string> = {
    dashboard: "Dashboard",
    affiliates: "Ambassador Management",
    commissions: "Bonus Management",
    referrals: role === "admin" ? "Referral Tracking" : "Referrals",
    links: role === "admin" ? "Link Management" : "My Links",
    activity: "Activity Log",
    admins: "Admin Users",
    reports: "Analytics Reports",
    settings: role === "admin" ? "System Settings" : "Settings",
    earnings: "Earnings",
    help: "Help Center",
  };

  // Fetch notifications when the dropdown opens
  useEffect(() => {
    if (!notifOpen) return;
    setLoadingNotifs(true);
    const token = localStorage.getItem("elevateme_token");
    const endpoint =
      role === "admin" ? "/api/admin/activities?limit=5" : "/api/affiliate/dashboard";
    fetch(endpoint, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (data.activities) setActivities(data.activities);
        else setActivities([]);
      })
      .catch(() => setActivities([]))
      .finally(() => setLoadingNotifs(false));
  }, [notifOpen, role]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on Escape key
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const unreadCount = activities.length;

  // Add Referral modal (affiliate only)
  const { affiliate, token } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [addResumeFile, setAddResumeFile] = useState<File | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const openAddModal = () => {
    setAddForm({ name: "", email: "", phone: "", notes: "" });
    setAddResumeFile(null);
    setAddError(null);
    setAddSuccess(false);
    setShowAddModal(true);
  };

  const handleAddReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate?.referralCode || !token) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          referralCode: affiliate.referralCode,
          visitorName: addForm.name,
          visitorEmail: addForm.email,
          visitorPhone: addForm.phone || undefined,
          source: "direct",
          notes: addForm.notes || undefined,
        }),
      });
      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || "Failed to add referral");
      if (addResumeFile && responseData.id) {
        const fd = new FormData();
        fd.append("file", addResumeFile);
        fd.append("referralId", responseData.id);
        await fetch("/api/upload/resume", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      }
      setAddSuccess(true);
      setTimeout(() => { setShowAddModal(false); setAddSuccess(false); }, 1500);
    } catch (err: any) {
      setAddError(err.message || "Something went wrong");
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-rx-gray-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full z-50 bg-white border-r border-rx-gray-200 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? "w-[72px]" : "w-[260px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-5 border-b border-rx-gray-100 flex items-center gap-3">
          <img src="/logo.svg" alt="ElevateMe" className="h-9 w-auto flex-shrink-0" />
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {navGroups.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
              {!sidebarCollapsed && (
                <div className="text-[11px] font-semibold uppercase tracking-wider text-rx-gray-400 px-3 pb-2">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const badge =
                  item.id === "referrals" && referralCount ? referralCount : item.badge;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onPageChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all relative text-left ${
                      activePage === item.id
                        ? "bg-rx-primary-light text-rx-primary-dark font-semibold"
                        : "text-rx-gray-600 hover:bg-rx-gray-50 hover:text-rx-gray-800"
                    }`}
                  >
                    {activePage === item.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-rx-primary rounded-r" />
                    )}
                    {item.icon}
                    {!sidebarCollapsed && (
                      <span className="text-sm whitespace-nowrap">{item.label}</span>
                    )}
                    {!sidebarCollapsed && badge && (
                      <span className="ml-auto bg-rx-danger text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-rx-gray-100">
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-rx-gray-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rx-primary to-rx-primary-dark flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {userInfo.initials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold text-rx-gray-800 truncate">
                  {userInfo.name}
                </div>
                <div className="text-xs text-rx-gray-500 truncate">{userInfo.role}</div>
              </div>
            )}
          </button>
        </div>
      </aside>

      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        }`}
      >
        <header className="h-16 bg-white border-b border-rx-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 768)
                  setMobileOpen(!mobileOpen);
                else setSidebarCollapsed(!sidebarCollapsed);
              }}
              className="w-9 h-9 rounded-lg border border-rx-gray-200 bg-white flex items-center justify-center text-rx-gray-600 hover:bg-rx-gray-50 hover:text-rx-gray-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-rx-gray-900 font-heading">{pageTitle}</h1>
              <div className="flex items-center gap-2 text-[13px] text-rx-gray-500">
                <button
                  onClick={() => onPageChange("dashboard")}
                  className="hover:text-rx-primary transition-colors"
                >
                  Home
                </button>
                <ChevronRight className="w-3 h-3" />
                <span>{breadcrumbMap[activePage] || pageTitle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Add Referral button — affiliate only */}
            {role === "affiliate" && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-3 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Referral</span>
              </button>
            )}
            {/* Notifications dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="w-9 h-9 rounded-lg border border-rx-gray-200 bg-white flex items-center justify-center text-rx-gray-600 hover:bg-rx-gray-50 transition-colors relative"
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-rx-danger rounded-full border-2 border-white" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-rx-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-rx-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-rx-gray-900">Notifications</h3>
                    <button
                      onClick={() => {
                        setNotifOpen(false);
                        onPageChange("activity");
                      }}
                      className="text-xs text-rx-primary hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifs ? (
                      <div className="px-4 py-8 text-center text-sm text-rx-gray-400">
                        Loading…
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-rx-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-rx-gray-300" />
                        No notifications yet
                      </div>
                    ) : (
                      activities.map((a) => (
                        <div
                          key={a.id}
                          className="px-4 py-3 border-b border-rx-gray-50 hover:bg-rx-gray-50 cursor-pointer"
                          onClick={() => {
                            setNotifOpen(false);
                            if (a.entity === "referral") onPageChange("referrals");
                            else if (a.entity === "affiliate") onPageChange("affiliates");
                            else if (a.entity === "commission") onPageChange("commissions");
                            else onPageChange("activity");
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-rx-danger mt-1.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-rx-gray-700 line-clamp-2">
                                {a.details || a.action}
                              </p>
                              <p className="text-xs text-rx-gray-400 mt-1">
                                {new Date(a.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-rx-primary to-rx-primary-dark flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 hover:opacity-90 transition-opacity"
                aria-label="Profile menu"
                aria-expanded={profileOpen}
              >
                {userInfo.initials}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-rx-gray-200 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-rx-gray-100">
                    <p className="text-sm font-semibold text-rx-gray-900 truncate">
                      {userInfo.name}
                    </p>
                    <p className="text-xs text-rx-gray-500 truncate">
                      {role === "admin" ? "Program Manager" : "Ambassador"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onPageChange("settings");
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-rx-gray-700 hover:bg-rx-gray-50 flex items-center gap-2"
                  >
                    <UserCircle className="w-4 h-4 text-rx-gray-400" />
                    My Settings
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-rx-danger hover:bg-rx-danger-light flex items-center gap-2 border-t border-rx-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="p-6 max-w-[1440px]">{children}</div>
      </main>

      {/* Add Referral Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Add Referral</h3>
              <button onClick={() => setShowAddModal(false)} className="text-rx-gray-400 hover:text-rx-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {addSuccess ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-rx-secondary-light flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="w-6 h-6 text-rx-secondary" />
                </div>
                <p className="text-sm font-semibold text-rx-gray-800">Referral added successfully!</p>
              </div>
            ) : (
              <form onSubmit={handleAddReferral} className="space-y-4">
                {addError && (
                  <div className="p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {addError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Full Name <span className="text-rx-danger">*</span></label>
                  <input type="text" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all" placeholder="Enter full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Email <span className="text-rx-danger">*</span></label>
                  <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Phone <span className="text-rx-danger">*</span></label>
                  <input type="tel" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: formatPhone(e.target.value) })} required className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all" placeholder="+1 (555) 123-4567" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Notes <span className="text-rx-gray-400 text-xs font-normal">(Optional)</span></label>
                  <textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} rows={3} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:ring-[3px] focus:ring-rx-primary-light transition-all resize-y" placeholder="Add any relevant context about this referral..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Resume <span className="text-rx-gray-400 text-xs font-normal">(Optional — PDF or Word, max 5MB)</span></label>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setAddResumeFile(e.target.files?.[0] || null)} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-rx-primary-light file:text-rx-primary" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Cancel</button>
                  <button type="submit" disabled={addLoading} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50">{addLoading ? "Adding..." : "Add Referral"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
