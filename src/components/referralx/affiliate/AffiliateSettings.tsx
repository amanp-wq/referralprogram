"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  RefreshCw, AlertCircle, Loader2, Save, CheckCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SettingsAffiliate {
  id: string;
  referralCode: string;
  tier: string;
  commissionRate: number;
  payoutMethod: string;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  payoutEmail: string | null;
}

interface SettingsUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
}

interface SettingsData {
  affiliate: SettingsAffiliate;
  user: SettingsUser;
}

export function AffiliateSettings() {
  const { token } = useAuth();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPayoutMethod, setFormPayoutMethod] = useState("bank");
  const [formBankName, setFormBankName] = useState("");
  const [formBankAccount, setFormBankAccount] = useState("");
  const [formBankIfsc, setFormBankIfsc] = useState("");
  const [formUpiId, setFormUpiId] = useState("");
  const [formPayoutEmail, setFormPayoutEmail] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [conversionAlerts, setConversionAlerts] = useState(true);
  const [payoutAlerts, setPayoutAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [monthlyReport, setMonthlyReport] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/affiliate/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load settings");
      }
      const json = await res.json();
      setData(json);

      // Populate form fields
      if (json.user) {
        setFormName(json.user.name || "");
        setFormEmail(json.user.email || "");
        setFormPhone(json.user.phone || "");
      }
      if (json.affiliate) {
        setFormPayoutMethod(json.affiliate.payoutMethod || "bank");
        setFormBankName(json.affiliate.bankName || "");
        setFormBankAccount(json.affiliate.bankAccount || "");
        setFormBankIfsc(json.affiliate.bankIfsc || "");
        setFormUpiId(json.affiliate.upiId || "");
        setFormPayoutEmail(json.affiliate.payoutEmail || "");
      }
      // Load notification settings from API
      if (json.notifications) {
        setEmailNotifications(json.notifications.emailNotifications ?? true);
        setConversionAlerts(json.notifications.conversionAlerts ?? true);
        setPayoutAlerts(json.notifications.payoutAlerts ?? true);
        setWeeklyReport(json.notifications.weeklyReport ?? true);
        setMonthlyReport(json.notifications.monthlyReport ?? false);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/affiliate/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          payoutMethod: formPayoutMethod,
          bankName: formBankName,
          bankAccount: formBankAccount,
          bankIfsc: formBankIfsc,
          upiId: formUpiId,
          payoutEmail: formPayoutEmail,
          emailNotifications,
          conversionAlerts,
          payoutAlerts,
          weeklyReport,
          monthlyReport,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save settings");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-rx-danger mb-4" />
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-2">Failed to load settings</h3>
        <p className="text-sm text-rx-gray-500 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-1">Profile Settings</h3>
        <p className="text-sm text-rx-gray-500 mb-6">Update your personal information</p>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={formEmail}
                readOnly
                className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 text-rx-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Referral Code</label>
              <input
                type="text"
                value={data?.affiliate?.referralCode || ""}
                readOnly
                className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 text-rx-gray-500 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-1">Notification Settings</h3>
        <p className="text-sm text-rx-gray-500 mb-6">Choose how you want to be notified</p>
        <div className="space-y-1">
          {[
            { key: "emailNotifications", label: "Email Notifications", desc: "Receive email alerts for important events", value: emailNotifications, setter: setEmailNotifications },
            { key: "conversionAlerts", label: "Conversion Alerts", desc: "Get notified when you earn a commission", value: conversionAlerts, setter: setConversionAlerts },
            { key: "payoutAlerts", label: "Payout Alerts", desc: "Get notified about payout status changes", value: payoutAlerts, setter: setPayoutAlerts },
            { key: "weeklyReport", label: "Weekly Report", desc: "Receive a weekly performance summary", value: weeklyReport, setter: setWeeklyReport },
            { key: "monthlyReport", label: "Monthly Report", desc: "Receive a monthly performance summary", value: monthlyReport, setter: setMonthlyReport },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-4 border-b border-rx-gray-100 last:border-0">
              <div>
                <div className="text-sm font-medium text-rx-gray-700">{item.label}</div>
                <div className="text-xs text-rx-gray-500 mt-0.5">{item.desc}</div>
              </div>
              <button
                onClick={() => item.setter(!item.value)}
                className={`w-11 h-6 rounded-full relative transition-colors ${item.value ? "bg-rx-primary" : "bg-rx-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${item.value ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Method */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-1">Payout Method</h3>
        <p className="text-sm text-rx-gray-500 mb-6">Set your preferred payout method</p>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { id: "bank", label: "Bank Transfer", detail: formBankAccount ? `****${formBankAccount.slice(-4)}` : "Not configured" },
                { id: "paypal", label: "PayPal", detail: formPayoutEmail || "Not configured" },
                { id: "upi", label: "UPI", detail: formUpiId || "Not configured" },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setFormPayoutMethod(method.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formPayoutMethod === method.id
                      ? "border-rx-primary bg-rx-primary-light"
                      : "border-rx-gray-200 hover:border-rx-gray-300"
                  }`}
                >
                  <div className="text-sm font-semibold text-rx-gray-800">{method.label}</div>
                  <div className="text-xs text-rx-gray-500 mt-1">{method.detail}</div>
                </button>
              ))}
            </div>

            {/* Bank details form */}
            {formPayoutMethod === "bank" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-rx-gray-100">
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Bank Name</label>
                  <input
                    type="text"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    placeholder="Enter bank name"
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Account Number</label>
                  <input
                    type="text"
                    value={formBankAccount}
                    onChange={(e) => setFormBankAccount(e.target.value)}
                    placeholder="Enter account number"
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">IFSC Code</label>
                  <input
                    type="text"
                    value={formBankIfsc}
                    onChange={(e) => setFormBankIfsc(e.target.value)}
                    placeholder="Enter IFSC code"
                    className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                  />
                </div>
              </div>
            )}

            {formPayoutMethod === "paypal" && (
              <div className="pt-4 border-t border-rx-gray-100">
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">PayPal Email</label>
                <input
                  type="email"
                  value={formPayoutEmail}
                  onChange={(e) => setFormPayoutEmail(e.target.value)}
                  placeholder="Enter PayPal email"
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                />
              </div>
            )}

            {formPayoutMethod === "upi" && (
              <div className="pt-4 border-t border-rx-gray-100">
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">UPI ID</label>
                <input
                  type="text"
                  value={formUpiId}
                  onChange={(e) => setFormUpiId(e.target.value)}
                  placeholder="Enter UPI ID"
                  className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saveSuccess && (
          <div className="inline-flex items-center gap-2 text-rx-secondary text-sm font-semibold">
            <CheckCircle className="w-4 h-4" /> Settings saved successfully!
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
