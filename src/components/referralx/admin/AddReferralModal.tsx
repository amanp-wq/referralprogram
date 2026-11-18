"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, getInitials } from "../shared";
import { Search, X, AlertTriangle, ChevronDown } from "lucide-react";

interface AmbassadorOption {
  id: string;
  referralCode: string;
  User?: { name: string; email: string; avatarUrl?: string | null };
}

interface Duplicate {
  id: string;
  visitorName: string | null;
  status: string;
  ambassadorName: string;
}

const EMPTY_FORM = { visitorName: "", visitorEmail: "", visitorPhone: "", status: "submitted", notes: "" };

// Admin "Add Referral": pick an ambassador, enter the student's details.
export function AddReferralModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [allAmbassadors, setAllAmbassadors] = useState<AmbassadorOption[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [ambassador, setAmbassador] = useState<AmbassadorOption | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);

  // Load every ambassador once (sorted by name) for the dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/affiliates?options=1", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (res.ok) setAllAmbassadors(json.affiliates || []);
      } catch { /* list stays empty; error shows on save */ } finally { setLoadingList(false); }
    })();
  }, [token]);

  // Close the dropdown when clicking outside it
  useEffect(() => {
    if (!listOpen) return;
    const onDown = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setListOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [listOpen]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allAmbassadors;
    return allAmbassadors.filter((o) =>
      (o.User?.name || "").toLowerCase().includes(q) ||
      (o.User?.email || "").toLowerCase().includes(q) ||
      (o.referralCode || "").toLowerCase().includes(q));
  }, [allAmbassadors, query]);

  const set = (key: keyof typeof EMPTY_FORM, value: string) => { setForm((f) => ({ ...f, [key]: value })); setDuplicate(null); setError(null); };

  const save = async (force = false) => {
    if (!ambassador) { setError("Please choose an ambassador"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ affiliateId: ambassador.id, ...form, force }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.duplicate) { setDuplicate(json.duplicate); return; }
      if (!res.ok) throw new Error(json.error || "Could not add referral");
      onAdded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-3 py-2 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rx-gray-100">
          <h3 className="text-lg font-semibold text-rx-gray-800">Add Referral</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-rx-gray-400 hover:bg-rx-gray-50" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Ambassador */}
          <div>
            <label className="block text-xs font-semibold text-rx-gray-600 mb-1.5">Ambassador *</label>
            {ambassador ? (
              <div className="flex items-center gap-3 px-3 py-2 border border-rx-gray-200 rounded-lg">
                <Avatar initials={getInitials(ambassador.User?.name || "?")} src={ambassador.User?.avatarUrl || undefined} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-rx-gray-800 truncate">{ambassador.User?.name || "Unknown"}</div>
                  <div className="text-xs text-rx-gray-500 truncate">{ambassador.User?.email} · {ambassador.referralCode}</div>
                </div>
                <button onClick={() => { setAmbassador(null); setQuery(""); setDuplicate(null); }} className="text-xs text-rx-primary font-medium hover:underline">Change</button>
              </div>
            ) : (
              <div className="relative" ref={pickerRef}>
                <Search className="w-4 h-4 text-rx-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setListOpen(true); }}
                  onFocus={() => setListOpen(true)}
                  onClick={() => setListOpen(true)}
                  placeholder={loadingList ? "Loading ambassadors…" : `Select an ambassador (${allAmbassadors.length}) — or type to filter`}
                  className={`${input} pl-9 pr-9 cursor-pointer`}
                />
                <button type="button" onClick={() => setListOpen((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-rx-gray-400 hover:text-rx-gray-600" aria-label="Show all ambassadors">
                  <ChevronDown className={`w-4 h-4 transition-transform ${listOpen ? "rotate-180" : ""}`} />
                </button>
                {listOpen && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-rx-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {loadingList ? (
                      <div className="px-3 py-3 text-sm text-rx-gray-400">Loading…</div>
                    ) : options.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-rx-gray-400">No ambassador found</div>
                    ) : options.map((o) => (
                      <button key={o.id} onClick={() => { setAmbassador(o); setListOpen(false); setQuery(""); setError(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-rx-gray-50">
                        <Avatar initials={getInitials(o.User?.name || "?")} src={o.User?.avatarUrl || undefined} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-rx-gray-800 truncate">{o.User?.name || "Unknown"}</div>
                          <div className="text-xs text-rx-gray-500 truncate">{o.User?.email} · {o.referralCode}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Student */}
          <div>
            <label className="block text-xs font-semibold text-rx-gray-600 mb-1.5">Student name *</label>
            <input value={form.visitorName} onChange={(e) => set("visitorName", e.target.value)} className={input} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-rx-gray-600 mb-1.5">Student email</label>
              <input type="email" value={form.visitorEmail} onChange={(e) => set("visitorEmail", e.target.value)} className={input} placeholder="name@example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-rx-gray-600 mb-1.5">Student phone</label>
              <input type="tel" value={form.visitorPhone} onChange={(e) => set("visitorPhone", e.target.value)} className={input} placeholder="(614) 555-1234" />
            </div>
          </div>
          <p className="text-xs text-rx-gray-500 -mt-2">Email or phone — at least one is required.</p>
          <div>
            <label className="block text-xs font-semibold text-rx-gray-600 mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={input}>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="enrolled">Enrolled</option>
              <option value="not_enrolled">Not Enrolled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {form.status === "enrolled" && <p className="text-xs text-rx-gray-500 mt-1">A $0 pending bonus will be created — set the amount on the Bonus page.</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-rx-gray-600 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={input} placeholder="Optional" />
          </div>

          {duplicate && (
            <div className="flex gap-2.5 p-3 rounded-lg bg-rx-warning-light text-sm text-rx-gray-700">
              <AlertTriangle className="w-4 h-4 text-rx-warning flex-shrink-0 mt-0.5" />
              <div>
                This student is already referred: <b>{duplicate.visitorName || "Unknown"}</b> by <b>{duplicate.ambassadorName}</b> (status: {duplicate.status.replace("_", " ")}).
                <div className="mt-2 flex gap-3">
                  <button onClick={() => save(true)} disabled={saving} className="text-xs font-semibold text-rx-primary hover:underline disabled:opacity-50">Add anyway</button>
                  <button onClick={onClose} className="text-xs font-medium text-rx-gray-500 hover:underline">Cancel</button>
                </div>
              </div>
            </div>
          )}
          {error && <div className="p-3 rounded-lg bg-rx-danger-light text-sm text-rx-danger">{error}</div>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-rx-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Cancel</button>
          <button onClick={() => save(false)} disabled={saving || !!duplicate} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50">
            {saving ? "Saving…" : "Add Referral"}
          </button>
        </div>
      </div>
    </div>
  );
}
