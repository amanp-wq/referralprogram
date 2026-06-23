"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
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
            <h2 className="text-2xl font-bold text-rx-gray-900 font-heading">Forgot Password</h2>
            <p className="text-rx-gray-500 mt-1 text-sm">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-rx-secondary-light flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-rx-secondary" />
              </div>
              <h3 className="text-lg font-semibold text-rx-gray-900 mb-2">Check your email</h3>
              <p className="text-sm text-rx-gray-500 mb-6">
                If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="text-sm text-rx-secondary font-semibold hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-rx-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-rx-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
              <div className="mt-5 pt-4 border-t border-rx-gray-100 text-center">
                <button
                  onClick={() => router.push("/login")}
                  className="inline-flex items-center gap-1.5 text-sm text-rx-gray-500 hover:text-rx-gray-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
              </div>
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
