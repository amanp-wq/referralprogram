"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge, ErrorWithRetry, EmptyState, CardSkeleton, formatCurrency, formatDate } from "../shared";
import { Target, Users, DollarSign, Calendar, Plus, ArrowRight, X, Globe, Cookie, FileText, Edit, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Program {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  commissionType: string;
  commissionValue: number;
  minPayout: number;
  cookieDuration: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  landingPageUrl: string | null;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
  affiliateCount?: number;
}

export function AdminPrograms() {
  const { token } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", slug: "", description: "", commissionType: "percentage", commissionValue: "10", minPayout: "50", cookieDuration: "30", landingPageUrl: "", terms: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", commissionType: "percentage", commissionValue: "10", minPayout: "50", cookieDuration: "30", landingPageUrl: "", terms: "", isActive: true });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/programs", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load programs");
      }
      const json = await res.json();
      setPrograms(json.programs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load programs");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  const handleCreate = async () => {
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/programs", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          commissionValue: parseFloat(createForm.commissionValue),
          minPayout: parseFloat(createForm.minPayout),
          cookieDuration: parseInt(createForm.cookieDuration),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create program");
      toast({ title: "Program created", description: `${createForm.name} has been created successfully` });
      setShowCreate(false);
      setCreateForm({ name: "", slug: "", description: "", commissionType: "percentage", commissionValue: "10", minPayout: "50", cookieDuration: "30", landingPageUrl: "", terms: "" });
      fetchData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (program: Program) => {
    try {
      const res = await fetch("/api/admin/programs", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id: program.id, isActive: !program.isActive }),
      });
      if (res.ok) {
        toast({ title: "Program updated", description: `${program.name} is now ${!program.isActive ? "active" : "inactive"}` });
        fetchData();
      }
    } catch {}
  };

  const handleViewDetails = (program: Program) => {
    setSelectedProgram(program);
    setShowDetails(true);
  };

  const handleOpenEdit = (program: Program) => {
    setEditForm({
      name: program.name,
      description: program.description || "",
      commissionType: program.commissionType,
      commissionValue: String(program.commissionValue),
      minPayout: String(program.minPayout),
      cookieDuration: String(program.cookieDuration),
      landingPageUrl: program.landingPageUrl || "",
      terms: program.terms || "",
      isActive: program.isActive,
    });
    setEditError(null);
    setShowDetails(false);
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!selectedProgram) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch("/api/admin/programs", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProgram.id,
          name: editForm.name,
          description: editForm.description,
          commissionType: editForm.commissionType,
          commissionValue: parseFloat(editForm.commissionValue),
          minPayout: parseFloat(editForm.minPayout),
          cookieDuration: parseInt(editForm.cookieDuration),
          landingPageUrl: editForm.landingPageUrl,
          terms: editForm.terms,
          isActive: editForm.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update program");
      toast({ title: "Program updated", description: `${editForm.name} has been updated successfully` });
      setShowEdit(false);
      fetchData();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  if (error) {
    return <ErrorWithRetry message={error} onRetry={fetchData} />;
  }

  const gradientColors = [
    "from-rx-primary to-rx-primary-dark",
    "from-rx-secondary to-[#059669]",
    "from-rx-warning to-[#d97706]",
    "from-rx-info to-[#1d4ed8]",
    "from-rx-danger to-[#dc2626]",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-rx-gray-800">Campaign Programs</h3>
          <p className="text-sm text-rx-gray-500">Manage and monitor your referral programs</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark"
        >
          <Plus className="w-4 h-4" /> Create Program
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : programs.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState title="No programs yet" description="Create your first referral program to get started" />
          </div>
        ) : (
          programs.map((p, i) => (
            <div key={p.id} className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientColors[i % gradientColors.length]}`} />
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-rx-gray-800">{p.name}</h4>
                  <p className="text-xs text-rx-gray-500 mt-1">
                    {p.commissionType === "percentage" ? `Percentage - ${p.commissionValue}%` : `Fixed - $${p.commissionValue}/referral`}
                  </p>
                </div>
                <button onClick={() => handleToggleActive(p)}>
                  <StatusBadge status={p.isActive ? "active" : "inactive"} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-rx-gray-400" />
                  <div>
                    <div className="text-xs text-rx-gray-500">Affiliates</div>
                    <div className="text-lg font-bold text-rx-gray-900">{p.affiliateCount || 0}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-rx-gray-400" />
                  <div>
                    <div className="text-xs text-rx-gray-500">Min Payout</div>
                    <div className="text-lg font-bold text-rx-gray-900">{formatCurrency(p.minPayout)}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-rx-gray-500 mb-4">
                <Calendar className="w-3.5 h-3.5" />
                <span>Cookie: {p.cookieDuration}d</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-rx-gray-100">
                <div className="flex -space-x-2">
                  <img src="/logo.svg" alt="ElevateMe" className="w-7 h-7 rounded-full border-2 border-white bg-rx-primary-light p-0.5 object-contain" />
                  {p.affiliateCount && p.affiliateCount > 1 && (
                    <div className="w-7 h-7 rounded-full bg-rx-gray-100 border-2 border-white flex items-center justify-center text-rx-gray-600 text-[10px] font-semibold">+{p.affiliateCount - 1}</div>
                  )}
                </div>
                <span onClick={() => handleViewDetails(p)} className="text-rx-primary text-[13px] font-semibold flex items-center gap-1 hover:gap-2 transition-all cursor-pointer">View Details <ArrowRight className="w-3 h-3" /></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Program Details Dialog */}
      {showDetails && selectedProgram && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDetails(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Program Details</h3>
              <button onClick={() => setShowDetails(false)} className="text-rx-gray-400 hover:text-rx-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <span className="text-sm text-rx-gray-500">Name</span>
                <span className="text-sm font-semibold text-rx-gray-800 text-right max-w-[60%]">{selectedProgram.name}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-sm text-rx-gray-500">Slug</span>
                <span className="text-sm font-mono text-rx-gray-700 text-right max-w-[60%]">{selectedProgram.slug}</span>
              </div>
              {selectedProgram.description && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-rx-gray-500">Description</span>
                  <span className="text-sm text-rx-gray-700 text-right max-w-[60%]">{selectedProgram.description}</span>
                </div>
              )}
              <div className="border-t border-rx-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-rx-gray-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Commission Type</span>
                  <span className="text-sm font-semibold text-rx-gray-800 capitalize">{selectedProgram.commissionType}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-rx-gray-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Commission Value</span>
                  <span className="text-sm font-semibold text-rx-gray-800">
                    {selectedProgram.commissionType === "percentage" ? `${selectedProgram.commissionValue}%` : formatCurrency(selectedProgram.commissionValue)}
                  </span>
                </div>
              </div>
              <div className="border-t border-rx-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-rx-gray-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Min Payout</span>
                  <span className="text-sm font-semibold text-rx-gray-800">{formatCurrency(selectedProgram.minPayout)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-rx-gray-500 flex items-center gap-1.5"><Cookie className="w-3.5 h-3.5" /> Cookie Duration</span>
                  <span className="text-sm font-semibold text-rx-gray-800">{selectedProgram.cookieDuration} days</span>
                </div>
              </div>
              {selectedProgram.landingPageUrl && (
                <div className="flex items-start justify-between border-t border-rx-gray-100 pt-4">
                  <span className="text-sm text-rx-gray-500 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Landing Page</span>
                  <a href={selectedProgram.landingPageUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-rx-primary hover:underline text-right max-w-[60%] break-all">{selectedProgram.landingPageUrl}</a>
                </div>
              )}
              <div className="border-t border-rx-gray-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-rx-gray-500">Status</span>
                  <StatusBadge status={selectedProgram.isActive ? "active" : "inactive"} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-rx-gray-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Created</span>
                  <span className="text-sm font-semibold text-rx-gray-800">{formatDate(selectedProgram.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDetails(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Close</button>
              <button onClick={() => handleOpenEdit(selectedProgram)} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark inline-flex items-center justify-center gap-2"><Edit className="w-4 h-4" /> Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Program Dialog */}
      {showEdit && selectedProgram && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Edit Program</h3>
              <button onClick={() => setShowEdit(false)} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>
            {editError && <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{editError}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Program Name</label><input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Description</label><textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" rows={3} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Commission Type</label><select value={editForm.commissionType} onChange={(e) => setEditForm({ ...editForm, commissionType: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Commission Value</label><input type="number" value={editForm.commissionValue} onChange={(e) => setEditForm({ ...editForm, commissionValue: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Min Payout ($)</label><input type="number" value={editForm.minPayout} onChange={(e) => setEditForm({ ...editForm, minPayout: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Cookie Duration (days)</label><input type="number" value={editForm.cookieDuration} onChange={(e) => setEditForm({ ...editForm, cookieDuration: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
              </div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Landing Page URL</label><input type="text" value={editForm.landingPageUrl} onChange={(e) => setEditForm({ ...editForm, landingPageUrl: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="https://..." /></div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-rx-gray-700">Active</label>
                <button onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })} className={`w-11 h-6 rounded-full relative transition-colors ${editForm.isActive ? "bg-rx-primary" : "bg-rx-gray-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${editForm.isActive ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEdit(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Cancel</button>
              <button onClick={handleEdit} disabled={editLoading} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Program Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-rx-gray-800">Create Program</h3>
              <button onClick={() => setShowCreate(false)} className="text-rx-gray-400 hover:text-rx-gray-600 text-xl">&times;</button>
            </div>
            {createError && <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{createError}</div>}
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Program Name</label><input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="e.g. Premium SaaS Plan" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Slug</label><input type="text" value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="e.g. premium-saas" /></div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Description</label><textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" rows={3} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Commission Type</label><select value={createForm.commissionType} onChange={(e) => setCreateForm({ ...createForm, commissionType: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option></select></div>
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Commission Value</label><input type="number" value={createForm.commissionValue} onChange={(e) => setCreateForm({ ...createForm, commissionValue: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Min Payout ($)</label><input type="number" value={createForm.minPayout} onChange={(e) => setCreateForm({ ...createForm, minPayout: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
                <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Cookie Duration (days)</label><input type="number" value={createForm.cookieDuration} onChange={(e) => setCreateForm({ ...createForm, cookieDuration: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" /></div>
              </div>
              <div><label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Landing Page URL</label><input type="text" value={createForm.landingPageUrl} onChange={(e) => setCreateForm({ ...createForm, landingPageUrl: e.target.value })} className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light" placeholder="https://..." /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-rx-gray-200 rounded-lg text-sm font-medium text-rx-gray-600 hover:bg-rx-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={createLoading} className="flex-1 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50">{createLoading ? "Creating..." : "Create Program"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
