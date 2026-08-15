"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminDashboard } from "@/components/referralx/admin/AdminDashboard";
import { AdminAffiliates } from "@/components/referralx/admin/AdminAffiliates";
import { AdminCommissions } from "@/components/referralx/admin/AdminCommissions";
import { AdminReferrals } from "@/components/referralx/admin/AdminReferrals";
import { AdminLinks } from "@/components/referralx/admin/AdminLinks";
import { AdminReports } from "@/components/referralx/admin/AdminReports";
import { AdminSettings } from "@/components/referralx/admin/AdminSettings";
import { AdminActivity } from "@/components/referralx/admin/AdminActivity";
import { AdminAdmins } from "@/components/referralx/admin/AdminAdmins";
import { AffiliateDashboard } from "@/components/referralx/affiliate/AffiliateDashboard";
import { AffiliateLinks } from "@/components/referralx/affiliate/AffiliateLinks";
import { AffiliateReferrals } from "@/components/referralx/affiliate/AffiliateReferrals";
import { AffiliateEarnings } from "@/components/referralx/affiliate/AffiliateEarnings";
import { AffiliateSettings } from "@/components/referralx/affiliate/AffiliateSettings";
import { AffiliateHelp } from "@/components/referralx/affiliate/AffiliateHelp";
import { AppShell } from "@/components/referralx/AppShell";
import { AmbassadorDetail, ReferenceDetail } from "@/components/referralx/admin/DetailViews";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type DetailTarget = { type: "ambassador" | "reference"; id: string } | null;

type AdminPage =
  | "dashboard"
  | "affiliates"
  | "commissions"
  | "referrals"
  | "links"
  | "activity"
  | "admins"
  | "reports"
  | "settings";
type AffiliatePage =
  | "dashboard"
  | "links"
  | "referrals"
  | "earnings"
  | "settings"
  | "help";

export default function AppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, logout, token } = useAuth();
  const [adminPage, setAdminPage] = useState<AdminPage>("dashboard");
  const [affiliatePage, setAffiliatePage] = useState<AffiliatePage>("dashboard");
  const [referralCount, setReferralCount] = useState<number>(0);
  const [detail, setDetail] = useState<DetailTarget>(null);

  const openDetail = (type: "ambassador" | "reference", id: string) => {
    setDetail({ type, id });
    router.replace(`/app?detail=${type}&id=${id}`);
  };
  const closeDetail = () => {
    setDetail(null);
    router.replace(`/app?tab=${adminPage}`);
  };

  // Auth guard — if not logged in, redirect to /login
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Read tab from URL query param on mount so refresh stays on current tab
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab || !user) return;
    if (user.role === "admin") {
      const validAdminPages: AdminPage[] = ["dashboard", "affiliates", "commissions", "referrals", "links", "activity", "admins", "reports", "settings"];
      if (validAdminPages.includes(tab as AdminPage)) setAdminPage(tab as AdminPage);
    } else {
      const validAffiliatePages: AffiliatePage[] = ["dashboard", "links", "referrals", "earnings", "settings", "help"];
      if (validAffiliatePages.includes(tab as AffiliatePage)) setAffiliatePage(tab as AffiliatePage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Deep-link to a detail page via ?detail=ambassador|reference&id=...
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    const d = searchParams.get("detail");
    const idp = searchParams.get("id");
    if ((d === "ambassador" || d === "reference") && idp) setDetail({ type: d, id: idp });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch referral count for sidebar badge
  useEffect(() => {
    if (!token || !user) return;
    const fetchCount = async () => {
      try {
        const endpoint =
          user.role === "admin"
            ? "/api/admin/referrals"
            : "/api/affiliate/referrals";
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setReferralCount(data.referrals?.length ?? 0);
        }
      } catch {
        // ignore — sidebar badge is non-critical
      }
    };
    fetchCount();
  }, [token, user]);

  // Loading state — proper SSR-safe skeleton (no blank flash)
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="w-8 h-8 text-rx-primary animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-rx-gray-500 sr-only">Loading ElevateMe Referral…</p>
          <p className="text-rx-gray-500" aria-hidden="true">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  // Admin dashboard
  if (user.role === "admin") {
    const renderPage = () => {
      switch (adminPage) {
        case "dashboard":
          return (
            <AdminDashboard
              onNavigate={(p) => setAdminPage(p as AdminPage)}
            />
          );
        case "affiliates":
          return <AdminAffiliates />;
        case "commissions":
          return <AdminCommissions />;
        case "referrals":
          return <AdminReferrals />;
        case "links":
          return <AdminLinks />;
        case "activity":
          return <AdminActivity />;
        case "admins":
          return <AdminAdmins />;
        case "reports":
          return <AdminReports />;
        case "settings":
          return <AdminSettings />;
      }
    };
    const pageTitles: Record<AdminPage, string> = {
      dashboard: "Dashboard",
      affiliates: "Ambassadors",
      commissions: "Commissions",
      referrals: "Referrals",
      links: "Tracking Links",
      activity: "Activity Log",
      admins: "Admin Users",
      reports: "Reports",
      settings: "Settings",
    };
    const detailTitle = detail ? (detail.type === "ambassador" ? "Ambassador Details" : "Reference Details") : null;
    return (
      <AppShell
        role="admin"
        activePage={adminPage}
        onPageChange={(p) => { setDetail(null); setAdminPage(p as AdminPage); router.replace(`/app?tab=${p}`); }}
        pageTitle={detailTitle || pageTitles[adminPage]}
        onLogout={logout}
        userName={user.name}
        referralCount={referralCount}
        onOpenDetail={openDetail}
      >
        {detail
          ? (detail.type === "ambassador"
              ? <AmbassadorDetail id={detail.id} onBack={closeDetail} />
              : <ReferenceDetail id={detail.id} onBack={closeDetail} />)
          : renderPage()}
      </AppShell>
    );
  }

  // Affiliate dashboard
  const renderPage = () => {
    switch (affiliatePage) {
      case "dashboard":
        return (
          <AffiliateDashboard
            onNavigate={(p) => setAffiliatePage(p as AffiliatePage)}
          />
        );
      case "links":
        return <AffiliateLinks />;
      case "referrals":
        return <AffiliateReferrals />;
      case "earnings":
        return <AffiliateEarnings />;
      case "settings":
        return <AffiliateSettings />;
      case "help":
        return <AffiliateHelp />;
    }
  };
  const pageTitles: Record<AffiliatePage, string> = {
    dashboard: "Dashboard",
    links: "My Link",
    referrals: "Referrals",
    earnings: "Earnings",
    settings: "Settings",
    help: "Help Center",
  };
  return (
    <AppShell
      role="affiliate"
      activePage={affiliatePage}
      onPageChange={(p) => { setAffiliatePage(p as AffiliatePage); router.replace(`/app?tab=${p}`); }}
      pageTitle={pageTitles[affiliatePage]}
      onLogout={logout}
      userName={user.name}
      referralCount={referralCount}
    >
      {renderPage()}
    </AppShell>
  );
}
