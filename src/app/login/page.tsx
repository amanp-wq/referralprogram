"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, Eye, EyeOff, Loader2, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      // AuthContext will set the user; redirect to /app
      router.push("/app");
    } else {
      setError(result.error || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-rx-gray-200">
          {/* Header */}
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="ElevateMe" className="h-12 w-auto mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-rx-gray-900 font-heading">Welcome Back</h2>
            <p className="text-rx-gray-500 mt-1">Sign in to your account</p>
          </div>

          {error && (
            <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-rx-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-rx-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="text-xs text-rx-secondary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-rx-gray-400 hover:text-rx-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rx-primary text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-rx-gray-100 space-y-3">
            <p className="text-sm text-rx-gray-500 text-center">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => router.push("/")}
                className="text-rx-secondary font-semibold hover:underline"
              >
                Sign up as Ambassador
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-rx-gray-400 text-xs mt-6">
          &copy; 2026 ElevateMe, Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
