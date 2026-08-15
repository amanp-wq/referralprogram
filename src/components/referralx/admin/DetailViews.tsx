"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, Avatar, ErrorWithRetry, formatDate, getInitials, formatCurrency } from "../shared";
import { ArrowLeft, Mail, Phone, Hash, Award, UserCircle2 } from "lucide-react";

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-rx-gray-50 flex items-center justify-center text-rx-gray-400 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-rx-gray-500">{label}</div>
        <div className="text-sm font-medium text-rx-gray-800 break-all">{value ?? "—"}</div>
      </div>
    </div>
  );
}

export function AmbassadorDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/affiliates/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load ambassador");
      setData(json);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [token, id]);
  useEffect(() => { if (token) load(); }, [token, load]);

  if (error) return <ErrorWithRetry message={error} onRetry={load} />;
  if (loading || !data) return <div className="py-16 text-center text-rx-gray-400">Loading…</div>;

  const a = data.affiliate;
  const u = a.User || {};
  const referrals = data.referrals || [];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-rx-gray-500 hover:text-rx-primary"><ArrowLeft className="w-4 h-4" /> Back</button>

      <div className="bg-white rounded-2xl border border-rx-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar initials={getInitials(u.name || "?")} src={u.avatarUrl} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-rx-gray-800">{u.name || "Unknown"}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rx-primary-light text-rx-primary font-semibold">Ambassador</span>
            </div>
            <div className="text-sm text-rx-gray-500">{u.email}</div>
          </div>
          <div className="ml-auto"><StatusBadge status={a.status as any} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field icon={<Mail className="w-4 h-4" />} label="Email" value={u.email} />
          <Field icon={<Phone className="w-4 h-4" />} label="Phone" value={u.phone} />
          <Field icon={<Hash className="w-4 h-4" />} label="Referral Code" value={a.referralCode} />
          <Field icon={<Award className="w-4 h-4" />} label="Tier" value={<span className="capitalize">{a.tier}</span>} />
          <Field icon={<UserCircle2 className="w-4 h-4" />} label="Admission Advisor" value={data.advisorLabel || "Unassigned"} />
          <Field icon={<Award className="w-4 h-4" />} label="Total Earnings" value={formatCurrency(a.totalEarnings || 0)} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-rx-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-rx-gray-100"><h3 className="text-base font-semibold text-rx-gray-800">References ({referrals.length})</h3></div>
        {referrals.length === 0 ? (
          <div className="py-10 text-center text-sm text-rx-gray-400">No references yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs font-semibold uppercase tracking-wider text-rx-gray-500 bg-rx-gray-50">
                <th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th>
              </tr></thead>
              <tbody>
                {referrals.map((r: any) => (
                  <tr key={r.id} className="border-b border-rx-gray-100 last:border-0">
                    <td className="px-5 py-3 text-rx-gray-800">{r.visitorName || "—"}</td>
                    <td className="px-5 py-3 text-rx-gray-600">{r.visitorEmail || "—"}</td>
                    <td className="px-5 py-3 text-rx-gray-600">{r.visitorPhone || "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={r.status as any} /></td>
                    <td className="px-5 py-3 text-rx-gray-500">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReferenceDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/referrals/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load reference");
      setData(json);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [token, id]);
  useEffect(() => { if (token) load(); }, [token, load]);

  if (error) return <ErrorWithRetry message={error} onRetry={load} />;
  if (loading || !data) return <div className="py-16 text-center text-rx-gray-400">Loading…</div>;

  const r = data;
  const ambassadorName = r.Affiliate?.User?.name || r.referralCode || "Unknown";

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-rx-gray-500 hover:text-rx-primary"><ArrowLeft className="w-4 h-4" /> Back</button>

      <div className="bg-white rounded-2xl border border-rx-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar initials={getInitials(r.visitorName || r.visitorEmail || "?")} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-rx-gray-800">{r.visitorName || r.visitorEmail || "Unknown"}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rx-secondary-light text-rx-secondary font-semibold">Reference</span>
            </div>
            <div className="text-sm text-rx-gray-500">{r.visitorEmail}</div>
          </div>
          <div className="ml-auto"><StatusBadge status={r.status as any} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Field icon={<Mail className="w-4 h-4" />} label="Email" value={r.visitorEmail} />
          <Field icon={<Phone className="w-4 h-4" />} label="Phone" value={r.visitorPhone} />
          <Field icon={<UserCircle2 className="w-4 h-4" />} label="Referred by" value={ambassadorName} />
          <Field icon={<Hash className="w-4 h-4" />} label="Referral Code" value={r.referralCode} />
          <Field icon={<Award className="w-4 h-4" />} label="Source" value={<span className="capitalize">{r.source || "direct"}</span>} />
          <Field icon={<Award className="w-4 h-4" />} label="Created" value={formatDate(r.createdAt)} />
        </div>
        {r.notes && (
          <div className="mt-5 p-4 bg-rx-gray-50 rounded-xl">
            <div className="text-xs font-medium text-rx-gray-500 mb-1">Notes</div>
            <p className="text-sm text-rx-gray-700 leading-relaxed">{r.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
