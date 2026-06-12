"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminDashboard } from "@/components/referralx/admin/AdminDashboard";
import { AdminAffiliates } from "@/components/referralx/admin/AdminAffiliates";
import { AdminCommissions } from "@/components/referralx/admin/AdminCommissions";
import { AdminReferrals } from "@/components/referralx/admin/AdminReferrals";
import { AdminLinks } from "@/components/referralx/admin/AdminLinks";
import { AdminReports } from "@/components/referralx/admin/AdminReports";
import { AdminSettings } from "@/components/referralx/admin/AdminSettings";
import { AffiliateDashboard } from "@/components/referralx/affiliate/AffiliateDashboard";
import { AffiliateLinks } from "@/components/referralx/affiliate/AffiliateLinks";
import { AffiliateReferrals } from "@/components/referralx/affiliate/AffiliateReferrals";
import { AffiliateEarnings } from "@/components/referralx/affiliate/AffiliateEarnings";
import { AffiliateSettings } from "@/components/referralx/affiliate/AffiliateSettings";
import { AffiliateHelp } from "@/components/referralx/affiliate/AffiliateHelp";
import { AppShell } from "@/components/referralx/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Users, Target, BarChart3, Zap, Shield, ArrowRight, LogIn, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

type Role = "none" | "admin" | "affiliate";
type AdminPage = "dashboard" | "affiliates" | "commissions" | "referrals" | "links" | "reports" | "settings";
type AffiliatePage = "dashboard" | "links" | "referrals" | "earnings" | "settings" | "help";

// Login Form Component
function LoginForm({ onSwitch, onSignup }: { onSwitch: () => void; onSignup: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-rx-gray-200">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="ElevateMe" className="h-12 w-auto mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-rx-gray-900 font-heading">Welcome Back</h2>
          <p className="text-rx-gray-500 mt-1">Sign in to your account</p>
        </div>
        {error && (
          <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium mb-4">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all pr-10"
                placeholder="Enter your password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-rx-gray-400 hover:text-rx-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-rx-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <><LogIn className="w-4 h-4" /> Sign In</>}
          </button>
        </form>
        <div className="mt-5 text-center">
          <p className="text-sm text-rx-gray-500">Don&apos;t have an account?{" "}
            <button onClick={onSignup} className="text-rx-secondary font-semibold hover:underline">Sign Up as Ambassador</button>
          </p>
        </div>
        <div className="mt-4 text-center">
          <button onClick={onSwitch} className="text-rx-gray-400 text-sm font-medium hover:text-rx-gray-600 hover:underline">← Back to home</button>
        </div>
        <div className="mt-4 pt-4 border-t border-rx-gray-100">
          <p className="text-xs text-rx-gray-400 text-center">Demo: admin@elevateme.pro / admin123</p>
          <p className="text-xs text-rx-gray-400 text-center">Demo: affiliate@elevateme.pro / affiliate123 (Ambassador)</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, affiliate, isLoading, logout, token } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [adminPage, setAdminPage] = useState<AdminPage>("dashboard");
  const [affiliatePage, setAffiliatePage] = useState<AffiliatePage>("dashboard");
  const [referralCount, setReferralCount] = useState<number>(0);

  // Fetch referral count for sidebar badge
  useEffect(() => {
    if (!token || !user) return;
    const fetchCount = async () => {
      try {
        const endpoint = user.role === "admin" ? "/api/admin/referrals" : "/api/affiliate/referrals";
        const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setReferralCount(data.total || 0);
        }
      } catch {}
    };
    fetchCount();
  }, [token, user]);

  // If logged in as admin
  if (user && user.role === "admin") {
    const renderPage = () => {
      switch (adminPage) {
        case "dashboard": return <AdminDashboard onNavigate={(p) => setAdminPage(p as AdminPage)} />;
        case "affiliates": return <AdminAffiliates />;
        case "commissions": return <AdminCommissions />;
        case "referrals": return <AdminReferrals />;
        case "links": return <AdminLinks />;
        case "reports": return <AdminReports />;
        case "settings": return <AdminSettings />;
      }
    };
    const pageTitles: Record<AdminPage, string> = { dashboard:"Dashboard", affiliates:"Ambassadors", commissions:"Commissions", referrals:"Referrals", links:"Tracking Links", reports:"Reports", settings:"Settings" };
    return <AppShell role="admin" activePage={adminPage} onPageChange={(p) => setAdminPage(p as AdminPage)} pageTitle={pageTitles[adminPage]} onLogout={logout} userName={user.name} referralCount={referralCount}>{renderPage()}</AppShell>;
  }

  // If logged in as affiliate
  if (user && user.role === "affiliate") {
    const renderPage = () => {
      switch (affiliatePage) {
        case "dashboard": return <AffiliateDashboard onNavigate={(p) => setAffiliatePage(p as AffiliatePage)} />;
        case "links": return <AffiliateLinks />;
        case "referrals": return <AffiliateReferrals />;
        case "earnings": return <AffiliateEarnings />;
        case "settings": return <AffiliateSettings />;
        case "help": return <AffiliateHelp />;
      }
    };
    const pageTitles: Record<AffiliatePage, string> = { dashboard:"Dashboard", links:"My Link", referrals:"Referrals", earnings:"Earnings", settings:"Settings", help:"Help Center" };
    return <AppShell role="affiliate" activePage={affiliatePage} onPageChange={(p) => setAffiliatePage(p as AffiliatePage)} pageTitle={pageTitles[affiliatePage]} onLogout={logout} userName={user.name} referralCount={referralCount}>{renderPage()}</AppShell>;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-rx-primary animate-spin mx-auto mb-4" />
          <p className="text-rx-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rx-primary via-rx-primary-dark to-[#8B2E20] flex items-center justify-center px-6">
        <LoginForm onSwitch={() => setShowLogin(false)} onSignup={() => router.push("/signup")} />
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-rx-gray-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-rx-primary via-rx-primary-dark to-[#8B2E20]">
        <div className="absolute inset-0 opacity-10"><div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"/><div className="absolute bottom-20 right-20 w-96 h-96 bg-rx-secondary rounded-full blur-3xl"/></div>
        {/* Navigation Header with Logo */}
        <nav className="relative max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ElevateMe" className="h-10 w-auto brightness-0 invert" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowLogin(true)} className="text-white/80 hover:text-white text-sm font-medium transition-colors">Sign In</button>
            <button onClick={() => router.push("/signup")} className="bg-white/10 backdrop-blur-sm text-white border border-white/20 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors flex items-center gap-1.5"><UserPlus className="w-4 h-4"/>Sign Up</button>
            <button onClick={() => setShowLogin(true)} className="bg-white text-rx-primary px-5 py-2 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors">Get Started</button>
          </div>
        </nav>
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6"><Zap className="w-4 h-4 text-rx-warning"/><span className="text-white/90 text-sm font-medium">Referral Program Platform</span></div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight font-heading">Elevate<span className="text-rx-secondary">Me</span></h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">The complete referral program management platform. Track ambassadors, manage commissions, and grow your business through the power of referrals.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <button onClick={() => { setShowLogin(true); }} className="group bg-white rounded-2xl p-8 text-left shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-rx-primary/20">
              <div className="flex items-center gap-4 mb-6"><div className="w-14 h-14 rounded-xl bg-rx-primary-light flex items-center justify-center"><Shield className="w-7 h-7 text-rx-primary"/></div><div><h3 className="text-2xl font-bold text-rx-gray-900 font-heading">Admin Portal</h3><p className="text-rx-gray-500 text-sm">Program Manager</p></div></div>
              <p className="text-rx-gray-600 mb-6 leading-relaxed">Manage your referral programs, oversee ambassadors, track commissions, and analyze performance reports.</p>
              <div className="flex flex-wrap gap-2 mb-6">{["Dashboard","Ambassadors","Commissions","Reports"].map(f=><span key={f} className="text-xs bg-rx-gray-100 text-rx-gray-600 px-3 py-1 rounded-full font-medium">{f}</span>)}</div>
              <div className="flex items-center gap-2 text-rx-primary font-semibold group-hover:gap-3 transition-all">Enter Admin Portal <ArrowRight className="w-4 h-4"/></div>
            </button>
            <button onClick={() => { router.push("/signup"); }} className="group bg-white rounded-2xl p-8 text-left shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-transparent hover:border-rx-secondary/20">
              <div className="flex items-center gap-4 mb-6"><div className="w-14 h-14 rounded-xl bg-rx-secondary-light flex items-center justify-center"><Users className="w-7 h-7 text-rx-secondary"/></div><div><h3 className="text-2xl font-bold text-rx-gray-900 font-heading">Ambassador Portal</h3><p className="text-rx-gray-500 text-sm">Become an Ambassador</p></div></div>
              <p className="text-rx-gray-600 mb-6 leading-relaxed">Join our referral program, get your unique tracking link, and start earning rewards for every successful referral.</p>
              <div className="flex flex-wrap gap-2 mb-6">{["Dashboard","My Links","Referrals","Earnings"].map(f=><span key={f} className="text-xs bg-rx-gray-100 text-rx-gray-600 px-3 py-1 rounded-full font-medium">{f}</span>)}</div>
              <div className="flex items-center gap-2 text-rx-secondary font-semibold group-hover:gap-3 transition-all">Sign Up as Ambassador <ArrowRight className="w-4 h-4"/></div>
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16"><h2 className="text-3xl font-bold text-rx-gray-900 mb-4 font-heading">Everything You Need</h2><p className="text-rx-gray-500 text-lg max-w-2xl mx-auto">A complete platform to launch, manage, and scale your referral programs</p></div>
        <div className="grid md:grid-cols-3 gap-8">{[{icon:Target,title:"Smart Tracking",desc:"Real-time tracking of referrals, clicks, and conversions with detailed analytics.",color:"bg-rx-primary-light text-rx-primary"},{icon:BarChart3,title:"Powerful Analytics",desc:"Comprehensive reports and insights to optimize your referral program performance.",color:"bg-rx-secondary-light text-rx-secondary"},{icon:Zap,title:"Instant Commissions",desc:"Automated commission calculations and flexible payout options for your ambassadors.",color:"bg-rx-warning-light text-rx-warning"}].map((feature,i)=><div key={i} className="bg-white rounded-xl p-8 border border-rx-gray-200 hover:shadow-lg transition-shadow"><div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4`}><feature.icon className="w-6 h-6"/></div><h3 className="text-lg font-semibold text-rx-gray-900 mb-2 font-card-header">{feature.title}</h3><p className="text-rx-gray-500 leading-relaxed">{feature.desc}</p></div>)}</div>
      </div>
      <footer className="bg-white border-t border-rx-gray-200 py-8"><div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex items-center gap-3"><img src="/logo.svg" alt="ElevateMe" className="h-8 w-auto" /></div><p className="text-rx-gray-500 text-sm">&copy; 2026 ElevateMe. All rights reserved.</p></div></footer>
    </div>
  );
}
