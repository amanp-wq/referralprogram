"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  KpiCard,
  StatusBadge,
  Avatar,
  ErrorWithRetry,
  EmptyState,
  TableSkeleton,
  formatDate,
  getInitials,
} from "../shared";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Phone,
} from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  status: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function AdminAdmins() {
  const { token, user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchAdmins = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/admins", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load admins");
      }
      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // Auto-clear success/error messages after 5 seconds
  useEffect(() => {
    if (actionSuccess || actionError) {
      const t = setTimeout(() => {
        setActionSuccess("");
        setActionError("");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [actionSuccess, actionError]);

  const handleDelete = async () => {
    if (!deleteTarget || !token) return;
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/admin/admins/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setActionSuccess(data.message || "Admin deleted successfully.");
      setDeleteTarget(null);
      fetchAdmins();
    } catch (err: any) {
      setActionError(err.message || "Failed to delete admin.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-rx-gray-900 font-heading">Admin Users</h2>
            <p className="text-sm text-rx-gray-500 mt-1">Loading…</p>
          </div>
        </div>
        <TableSkeleton rows={3} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorWithRetry
        message={error}
        onRetry={fetchAdmins}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-rx-gray-900 font-heading">Admin Users</h2>
          <p className="text-sm text-rx-gray-500 mt-1">
            Manage who has administrator access to the platform.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-rx-danger-light border border-rx-danger/20 text-rx-danger px-4 py-3 rounded-lg text-sm font-medium flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<ShieldCheck className="w-5 h-5" />}
          label="Total Admins"
          value={String(admins.length)}
          iconColor="primary"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Active"
          value={String(admins.filter((a) => a.status === "active").length)}
          iconColor="success"
        />
        <KpiCard
          icon={<Mail className="w-5 h-5" />}
          label="Verified Emails"
          value={String(admins.filter((a) => a.emailVerified).length)}
          iconColor="info"
        />
      </div>

      {/* Admin list */}
      {admins.length === 0 ? (
        <EmptyState
          title="No admin users yet"
          description="Create your first admin to manage the platform."
        />
      ) : (
        <div className="bg-white rounded-xl border border-rx-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-rx-gray-50 border-b border-rx-gray-200">
                <tr>
                  <th className="text-left text-xs font-semibold text-rx-gray-500 uppercase tracking-wider px-6 py-3">
                    Admin
                  </th>
                  <th className="text-left text-xs font-semibold text-rx-gray-500 uppercase tracking-wider px-6 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-semibold text-rx-gray-500 uppercase tracking-wider px-6 py-3">
                    Phone
                  </th>
                  <th className="text-left text-xs font-semibold text-rx-gray-500 uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-rx-gray-500 uppercase tracking-wider px-6 py-3">
                    Created
                  </th>
                  <th className="text-right text-xs font-semibold text-rx-gray-500 uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rx-gray-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-rx-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          initials={getInitials(admin.name)}
                        />
                        <div>
                          <p className="text-sm font-semibold text-rx-gray-900">
                            {admin.name}
                            {admin.id === currentUser?.id && (
                              <span className="ml-2 text-xs bg-rx-primary-light text-rx-primary px-2 py-0.5 rounded-full font-medium">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-rx-gray-500">
                            {admin.emailVerified ? "Verified" : "Not verified"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-rx-gray-700">{admin.email}</td>
                    <td className="px-6 py-4 text-sm text-rx-gray-700">{admin.phone || "—"}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={admin.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-rx-gray-500">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setActionError("");
                          setActionSuccess("");
                          setDeleteTarget(admin);
                        }}
                        disabled={admin.id === currentUser?.id}
                        className="text-rx-gray-400 hover:text-rx-danger disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-rx-gray-400 transition-colors p-1.5 rounded-lg hover:bg-rx-danger-light"
                        title={
                          admin.id === currentUser?.id
                            ? "You cannot delete your own account"
                            : "Delete admin"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Security best practices</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Only grant admin access to people you trust — admins can manage all data.</li>
              <li>Use strong passwords (minimum 12 characters, mix of letters, numbers, symbols).</li>
              <li>Remove admin access immediately when someone leaves your team.</li>
              <li>Keep at least 2 admin accounts to avoid lockout.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(msg) => {
            setActionSuccess(msg);
            setShowCreateModal(false);
            fetchAdmins();
          }}
          onError={(msg) => setActionError(msg)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteAdminModal
          admin={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ============================================================
// Create Admin Modal
// ============================================================
function CreateAdminModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    // Client-side validation
    if (!form.name.trim()) {
      setLocalError("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      setLocalError("Email is required");
      return;
    }
    if (form.password.length < 12) {
      setLocalError("Password must be at least 12 characters long");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          sendWelcomeEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");

      onSuccess(data.message || "Admin created successfully.");
    } catch (err: any) {
      setLocalError(err.message || "Failed to create admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-rx-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rx-primary-light flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-rx-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rx-gray-900">Add New Admin</h3>
              <p className="text-xs text-rx-gray-500">Grant administrator access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rx-gray-400 hover:text-rx-gray-600 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {localError && (
            <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {localError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
              Full Name <span className="text-rx-danger">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
              Email Address <span className="text-rx-danger">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                placeholder="admin@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
              Password <span className="text-rx-danger">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                minLength={12}
                className="w-full pl-10 pr-10 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                placeholder="Min. 12 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rx-gray-400 hover:text-rx-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-rx-gray-400 mt-1">
              This password will be required for the new admin&apos;s first login.
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
              Confirm Password <span className="text-rx-danger">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rx-gray-400 hover:text-rx-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Send welcome email */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendWelcomeEmail}
              onChange={(e) => setSendWelcomeEmail(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-rx-gray-300 text-rx-primary focus:ring-rx-primary"
            />
            <span className="text-sm text-rx-gray-700">
              Send welcome email with login instructions
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-rx-gray-100 text-rx-gray-700 rounded-lg text-sm font-semibold hover:bg-rx-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Create Admin
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// Delete Confirmation Modal
// ============================================================
function DeleteAdminModal({
  admin,
  onCancel,
  onConfirm,
}: {
  admin: AdminUser;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-rx-danger-light flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-rx-danger" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rx-gray-900">Delete Admin User</h3>
              <p className="text-sm text-rx-gray-500 mt-1">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <div className="bg-rx-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-rx-gray-700">
              You are about to delete the admin account for:
            </p>
            <p className="text-base font-semibold text-rx-gray-900 mt-1">
              {admin.name}
            </p>
            <p className="text-sm text-rx-gray-500">{admin.email}</p>
          </div>
          <p className="text-sm text-rx-gray-600 mb-6">
            The user will immediately lose access to the platform. Any sessions they have
            will continue until expiry (max 24 hours).
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-rx-gray-100 text-rx-gray-700 rounded-lg text-sm font-semibold hover:bg-rx-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 bg-rx-danger text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Delete Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
