"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-rx-gray-200">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="ElevateMe" className="h-12 w-auto mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-rx-gray-900 font-heading">Set New Password</h2>
            <p className="text-rx-gray-500 mt-1 text-sm">Enter your new password below</p>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-rx-secondary-light flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-rx-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-rx-gray-900 mb-2">Password updated!</h3>
              <p className="text-sm text-rx-gray-500 mb-6">
                Your password has been reset successfully. You can now sign in.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-rx-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-all"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all pr-10"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-rx-gray-400 hover:text-rx-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                    placeholder="Re-enter your password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full bg-rx-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-rx-gray-400 text-xs mt-6">
          &copy; 2026 ElevateMe, Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rx-primary animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
