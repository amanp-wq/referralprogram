"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SectionCard, ErrorWithRetry } from "../shared";
import { Save, CheckCircle, Plus, Trash2, Pencil } from "lucide-react";

interface SettingsMap {
  [key: string]: string;
}

// Manage the dynamic Admission Advisor dropdown options (add/edit/remove).
function AdmissionAdvisorsCard() {
  const { token } = useAuth();
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dropdowns?category=admission_advisor", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      setOptions(json.options || []);
    } catch { setOptions([]); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { if (token) load(); }, [token, load]);

  const add = async () => {
    if (!newLabel.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/admin/dropdowns", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ category: "admission_advisor", label: newLabel.trim() }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add");
      setNewLabel(""); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const saveEdit = async (id: string) => {
    if (!editingLabel.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/admin/dropdowns", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id, label: editingLabel.trim() }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      setEditingId(null); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const remove = async (id: string, label: string) => {
    if (!window.confirm(`Remove advisor "${label}"? Ambassadors/references assigned to them will become unassigned.`)) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/dropdowns?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove");
      load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Admission Advisors">
      <p className="text-xs text-rx-gray-500 mb-4">Manage the sales team advisors available for assignment to ambassadors.</p>
      {err && <div className="mb-3 p-2.5 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{err}</div>}
      <div className="flex gap-2 mb-4">
        <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Add advisor name…" className="flex-1 px-3 py-2 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary" />
        <button onClick={add} disabled={busy || !newLabel.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50"><Plus className="w-4 h-4" /> Add</button>
      </div>
      {loading ? (
        <div className="text-sm text-rx-gray-400 py-4">Loading…</div>
      ) : options.length === 0 ? (
        <div className="text-sm text-rx-gray-400 py-4">No advisors yet. Add your first one above.</div>
      ) : (
        <div className="divide-y divide-rx-gray-100">
          {options.map((o) => (
            <div key={o.id} className="flex items-center gap-2 py-2.5">
              {editingId === o.id ? (
                <>
                  <input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} className="flex-1 px-2.5 py-1.5 border border-rx-gray-200 rounded-lg text-sm" />
                  <button onClick={() => saveEdit(o.id)} disabled={busy} className="px-3 py-1.5 bg-rx-primary text-white rounded-lg text-xs font-semibold">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-rx-gray-200 rounded-lg text-xs">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-rx-gray-800">{o.label}</span>
                  <button onClick={() => { setEditingId(o.id); setEditingLabel(o.label); }} className="p-1.5 rounded-lg text-rx-gray-400 hover:text-rx-primary hover:bg-rx-primary-light" title="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(o.id, o.label)} className="p-1.5 rounded-lg text-rx-gray-400 hover:text-rx-danger hover:bg-rx-danger-light" title="Remove"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function AdminSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load settings");
      }
      const json = await res.json();
      const settingsMap = json.settings || {};
      setSettings({
        programName: settingsMap.programName || "ElevateMe Referral Program",
        commissionType: settingsMap.commissionType || "percentage",
        commissionRate: settingsMap.commissionRate || "20",
        minimumPayout: settingsMap.minimumPayout || "50",
        payoutSchedule: settingsMap.payoutSchedule || "monthly",
        emailNotifications: settingsMap.emailNotifications || "true",
        slackNotifications: settingsMap.slackNotifications || "false",
        newAffiliateAlert: settingsMap.newAffiliateAlert || "true",
        payoutAlert: settingsMap.payoutAlert || "true",
        weeklyReport: settingsMap.weeklyReport || "true",
        monthlyReport: settingsMap.monthlyReport || "true",
        autoApprove: settingsMap.autoApprove || "false",
        twoFactor: settingsMap.twoFactor || "true",
      });
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save settings");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const boolToggle = (key: string, label: string, desc: string) => (
    <div className="flex items-center justify-between py-4 border-b border-rx-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-rx-gray-700">{label}</div>
        <div className="text-xs text-rx-gray-500 mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => toggle(key as any)}
        className={`w-11 h-6 rounded-full relative transition-colors ${settings[key] === "true" ? "bg-rx-primary" : "bg-rx-gray-300"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings[key] === "true" ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {loading ? (
        <>
          <div className="bg-white rounded-2xl border border-rx-gray-200 p-5 animate-pulse">
            <div className="h-5 w-32 bg-rx-gray-200 rounded mb-6" />
            <div className="space-y-5">
              <div><div className="h-4 w-28 bg-rx-gray-100 rounded mb-2" /><div className="h-10 w-full bg-rx-gray-100 rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-5"><div><div className="h-4 w-28 bg-rx-gray-100 rounded mb-2" /><div className="h-10 w-full bg-rx-gray-100 rounded-lg" /></div><div><div className="h-4 w-28 bg-rx-gray-100 rounded mb-2" /><div className="h-10 w-full bg-rx-gray-100 rounded-lg" /></div></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-rx-gray-200 p-5 animate-pulse">
            <div className="h-5 w-40 bg-rx-gray-200 rounded mb-6" />
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex justify-between py-4 border-b border-rx-gray-100"><div><div className="h-4 w-32 bg-rx-gray-100 rounded mb-1" /><div className="h-3 w-48 bg-rx-gray-100 rounded" /></div><div className="h-6 w-11 bg-rx-gray-200 rounded-full" /></div>)}
          </div>
        </>
      ) : (
        <>
          <SectionCard title="Notification Preferences">
            <div className="space-y-1">
              {boolToggle("emailNotifications", "Email Notifications", "Receive email alerts for important events")}
              {boolToggle("slackNotifications", "Slack Notifications", "Send alerts to your Slack channel")}
              {boolToggle("newAffiliateAlert", "New Affiliate Alert", "Get notified when a new affiliate signs up")}
              {boolToggle("payoutAlert", "Payout Request Alert", "Get notified when a payout is requested")}
              {boolToggle("weeklyReport", "Weekly Report", "Receive a weekly performance summary")}
              {boolToggle("monthlyReport", "Monthly Report", "Receive a monthly performance summary")}
            </div>
          </SectionCard>

          <SectionCard title="Security">
            <div className="space-y-1">
              {boolToggle("autoApprove", "Auto-Approve Affiliates", "Automatically approve new affiliate applications")}
              {boolToggle("twoFactor", "Two-Factor Authentication", "Require 2FA for admin access")}
            </div>
          </SectionCard>

          <AdmissionAdvisorsCard />

          <div className="flex justify-end items-center gap-3">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1.5 text-sm text-rx-secondary font-medium">
                <CheckCircle className="w-4 h-4" /> Settings saved successfully
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
