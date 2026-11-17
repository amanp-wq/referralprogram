"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const box = "em-input mt-2 flex h-[48px] items-center gap-3 rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] px-4";
const inputCls = "flex-1 min-w-0 bg-transparent text-[15px] text-[#1e293b] placeholder:text-[#94a3b8] outline-none";

export function LoginCard() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      router.push("/app");
    } else {
      setError(result.error || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className="em-rise rounded-[22px] bg-white px-6 sm:px-[30px] pt-6 pb-8 shadow-[0_24px_60px_-28px_rgba(60,40,30,0.35)] border border-[#f1ece8]"
        style={{ animationDelay: "0.3s" }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 pb-5 border-b border-[#eef0f3]">
          <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#fdecea]">
            <LogIn className="h-6 w-6 text-[#c7493a]" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="em-display text-[20px] text-[#161616]" style={{ letterSpacing: "-0.01em" }}>Welcome Back</h2>
            <p className="text-[14px] text-[#64748b]">Sign in to your ElevateMe account</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-[18px]">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-[#ffebee] px-4 py-3 text-sm font-medium text-[#e53935]">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-[15px] font-medium text-[#1e293b]">Email Address</label>
            <div className={box}>
              <Mail className="h-[18px] w-[18px] shrink-0 text-[#94a3b8]" strokeWidth={1.8} />
              <input type="email" required className={inputCls} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-[15px] font-medium text-[#1e293b]">Password</label>
              <button type="button" onClick={() => router.push("/forgot-password")} className="text-[13.5px] font-medium text-[#488a6d] hover:underline underline-offset-2">
                Forgot password?
              </button>
            </div>
            <div className={box}>
              <Lock className="h-[18px] w-[18px] shrink-0 text-[#94a3b8]" strokeWidth={1.8} />
              <input type={showPassword ? "text" : "password"} required className={inputCls} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[#94a3b8] hover:text-[#488a6d] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="em-shine flex h-[52px] w-full items-center justify-center gap-3 rounded-[8px] text-[17px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(199,73,58,0.9)] transition-[filter] duration-200 hover:brightness-110 disabled:opacity-80"
            style={{ background: "linear-gradient(180deg,#d25a4a 0%,#b33f31 100%)" }}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" strokeWidth={2} />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-7 border-t border-[#eef0f3] pt-6 text-center">
          <p className="text-[15px] text-[#334155]">
            Don&apos;t have an account?{" "}
            <button onClick={() => router.push("/")} className="text-[17px] font-semibold text-[#488a6d] hover:underline underline-offset-2">
              Sign up as Ambassador
            </button>
          </p>
          <p className="mt-4 flex items-center justify-center gap-2 text-[13.5px] text-[#64748b]">
            <ShieldCheck className="h-[18px] w-[18px] text-[#488a6d]" strokeWidth={1.8} />
            Your information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}
