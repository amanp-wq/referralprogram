"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard, StatusBadge } from "../shared";
import {
  DollarSign, TrendingUp, Clock, CheckCircle, RefreshCw,
  AlertCircle, Gift, ArrowRight, Shield, Info, Award,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface EarningsKpis {
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  balance: number;
}

interface EarningsSummary {
  totalCommissions: number;
  referralCommissions: number;
  bonusCommissions: number;
}

interface EarningsData {
  kpis: EarningsKpis;
  summary: EarningsSummary;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AffiliateEarnings() {
  const { affiliate, token } = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/affiliate/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load earnings");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load earnings</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-secondary text-white rounded-lg text-sm font-semibold hover:bg-[#5a8566]">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-rx-gray-200">
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiCard
            label="Total Earnings"
            value={formatCurrency(data?.kpis.totalEarnings ?? 0)}
            iconColor="primary"
            icon={<DollarSign className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Available Balance"
            value={formatCurrency(data?.kpis.balance ?? 0)}
            iconColor="success"
            icon={<TrendingUp className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Pending"
            value={formatCurrency(data?.kpis.pendingEarnings ?? 0)}
            iconColor="warning"
            icon={<Clock className="w-[18px] h-[18px]" />}
          />
          <KpiCard
            label="Approved"
            value={formatCurrency(data?.kpis.approvedEarnings ?? 0)}
            iconColor="info"
            icon={<CheckCircle className="w-[18px] h-[18px]" />}
          />
        </div>
      )}

      {/* How Earnings Work */}
      <div className="bg-gradient-to-br from-rx-secondary to-[#4a7a58] rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute -top-1/4 -right-[10%] w-[300px] h-[300px] bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">How Your Earnings Work</h3>
              <p className="text-white/70 text-sm">Earn rewards for every successful referral</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white/10 border border-white/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">1</div>
                <h4 className="font-semibold text-lg">Refer a Student</h4>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Share your unique referral link with prospective students. When they submit their details through your link, it counts as a referral.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-semibold">Earn $50 per submitted referral</span>
              </div>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">2</div>
                <h4 className="font-semibold text-lg">Get Them Enrolled</h4>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                When your referral enrolls in a program and schedules a session, you earn an additional bonus. The more students you refer, the more you earn!
              </p>
              <div className="mt-3 inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5">
                <Award className="w-4 h-4" />
                <span className="text-sm font-semibold">Earn $100 when they enroll</span>
              </div>
            </div>
          </div>

          {/* Commission Process */}
          <div className="mt-6 bg-white/10 border border-white/20 rounded-xl p-5">
            <h4 className="font-semibold mb-4">Commission Process</h4>
            <div className="flex items-center justify-between flex-wrap gap-3">
              {[
                { label: "Referral Enrolled", icon: "🎯" },
                { label: "Commission Created", icon: "💰" },
                { label: "Admin Approves", icon: "✅" },
                { label: "Payment Released", icon: "🎉" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
                    <span className="text-base">{step.icon}</span>
                    <span className="text-xs font-medium">{step.label}</span>
                  </div>
                  {i < 3 && <ArrowRight className="w-4 h-4 text-white/40" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-rx-gray-800">Earnings Summary</h3>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs text-rx-gray-600 hover:bg-rx-gray-50"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-rx-gray-100">
              <span className="text-sm text-rx-gray-600">Total Earnings</span>
              <span className="text-lg font-bold text-rx-gray-900">{formatCurrency(data?.kpis.totalEarnings ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-rx-gray-100">
              <span className="text-sm text-rx-gray-600">Available Balance</span>
              <span className="text-lg font-bold text-rx-secondary">{formatCurrency(data?.kpis.balance ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-rx-gray-100">
              <span className="text-sm text-rx-gray-600">Pending Commissions</span>
              <span className="text-lg font-bold text-rx-warning">{formatCurrency(data?.kpis.pendingEarnings ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-rx-gray-100">
              <span className="text-sm text-rx-gray-600">Approved (Awaiting Payout)</span>
              <span className="text-lg font-bold text-rx-info">{formatCurrency(data?.kpis.approvedEarnings ?? 0)}</span>
            </div>
            {data?.summary && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-rx-gray-600">Total Commission Entries</span>
                <span className="text-lg font-bold text-rx-gray-700">{data.summary.totalCommissions}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Commission Management Note - Admin Only */}
      <div className="bg-rx-secondary-light border border-rx-secondary/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-rx-secondary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rx-gray-800 mb-1">Commission Management</p>
            <p className="text-xs text-rx-gray-600 leading-relaxed">
              All commissions are managed by the ElevateMe team. When your referral gets enrolled, a commission is automatically created and will be reviewed by our team. Once approved, it will be added to your available balance and processed for payout according to our schedule. For any questions about your commissions, please contact the ElevateMe team.
            </p>
          </div>
        </div>
      </div>

      {/* Bonus Structure */}
      <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-emerald-100 bg-emerald-50/50">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Info className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold text-emerald-800">Bonus Details</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Tier 1 — Submission Bonus</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 mb-1">$50</p>
              <p className="text-xs text-emerald-600">Earned when a referral submits their enrollment details through your link</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Tier 2 — Enrollment Bonus</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 mb-1">$100</p>
              <p className="text-xs text-emerald-600">Earned when your referral enrolls and schedules a session with the team</p>
            </div>
          </div>
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">How Calculations Work</span>
            </div>
            <div className="space-y-2 text-sm text-emerald-700">
              <p>Your total earnings are the sum of all approved commissions from your referrals.</p>
              <p>Each successful referral that is <strong>submitted</strong> earns you a <strong>$50</strong> bonus.</p>
              <p>When that referral gets <strong>enrolled</strong>, you earn an additional <strong>$100</strong> enrollment bonus.</p>
              <p>There is <strong>no limit</strong> on how many referrals you can make — earn unlimited commissions!</p>
              <p>Commissions go through a review process: <strong>Pending → Approved → Released → Paid</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
