"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  UserPlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Shield,
  Phone,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Gift,
  DollarSign,
  Users,
  ChevronRight,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

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
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!form.name.trim()) {
      setError("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email address is required");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Store token and log in the user automatically
      if (data.token) {
        localStorage.setItem("elevateme_token", data.token);
        // Auto-login
        await login(form.email.trim().toLowerCase(), form.password);
      }

      setReferralCode(data.affiliate?.referralCode || "");
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rx-primary via-rx-primary-dark to-[#8B2E20] flex items-center justify-center px-6 py-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-rx-secondary rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-lg relative z-10">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-rx-secondary-light flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-rx-secondary" />
            </div>

            <h2 className="text-2xl font-bold text-rx-gray-900 font-heading mb-2">
              Welcome to ElevateMe!
            </h2>
            <p className="text-rx-gray-500 mb-2">
              Your ambassador account has been created successfully,{" "}
              <strong className="text-rx-gray-800">{form.name}</strong>!
            </p>
            <p className="text-rx-gray-400 text-sm mb-6">
              Your profile is currently pending approval. You&apos;ll get full
              access once an admin reviews your application.
            </p>

            {/* Referral Code */}
            {referralCode && (
              <div className="bg-rx-gray-50 rounded-xl p-5 mb-6 border border-rx-gray-200">
                <p className="text-xs text-rx-gray-500 uppercase font-semibold tracking-wider mb-2">
                  Your Referral Code
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold text-rx-primary font-mono tracking-wider">
                    {referralCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                    }}
                    className="text-rx-gray-400 hover:text-rx-primary transition-colors p-1"
                    title="Copy code"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-rx-gray-400 mt-2">
                  Share this code to start earning rewards
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push("/")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-rx-primary text-white rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-colors"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-rx-gray-100 text-rx-gray-700 rounded-lg font-semibold text-sm hover:bg-rx-gray-200 transition-colors"
              >
                Explore Programs
              </button>
            </div>
          </div>

          <p className="text-center text-white/40 text-xs mt-6">
            &copy; 2026 ElevateMe, Inc. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rx-primary via-rx-primary-dark to-[#8B2E20] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-rx-secondary rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rx-warning rounded-full blur-3xl opacity-30" />
      </div>

      <div className="w-full max-w-5xl relative z-10 flex flex-col lg:flex-row gap-8 items-center">
        {/* Left side - Marketing / Info */}
        <div className="flex-1 text-white hidden lg:block">
          <div className="mb-8">
            <img
              src="/logo.svg"
              alt="ElevateMe"
              className="h-12 w-auto brightness-0 invert mb-6"
            />
            <h1 className="text-4xl font-bold font-heading mb-4 leading-tight">
              Join the ElevateMe
              <br />
              <span className="text-rx-secondary">Ambassador Program</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-md">
              Help aspiring IT professionals find their path and earn rewards
              for every successful referral. It&apos;s simple — refer, earn,
              repeat.
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              How It Works
            </h3>
            {[
              {
                step: "1",
                icon: Users,
                title: "Refer a Student",
                desc: "Share their details with the ElevateMe team",
                reward: "Earn $50",
              },
              {
                step: "2",
                icon: Gift,
                title: "Schedule a Session",
                desc: "Help connect them with our team for guidance",
                reward: "Earn $100",
              },
              {
                step: "3",
                icon: DollarSign,
                title: "Track & Earn",
                desc: "Monitor referrals and get paid for successes",
                reward: "Unlimited",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-semibold text-white text-sm">
                      {item.title}
                    </h4>
                    <span className="text-xs bg-rx-secondary/20 text-rx-secondary px-2 py-0.5 rounded-full font-medium">
                      {item.reward}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <img
              src="/logo.svg"
              alt="ElevateMe"
              className="h-10 w-auto brightness-0 invert mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-white font-heading">
              Become an Ambassador
            </h1>
            <p className="text-white/60 text-sm mt-1">
              Sign up to start earning with referrals
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-7">
            {/* Desktop Header */}
            <div className="hidden lg:block mb-6 pb-5 border-b border-rx-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rx-secondary-light flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-rx-secondary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-rx-gray-900">
                    Create Your Account
                  </h3>
                  <p className="text-xs text-rx-gray-500">
                    Join as an ElevateMe Ambassador
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rx-danger-light text-rx-danger px-4 py-3 rounded-lg text-sm font-medium mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
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
                    placeholder="Enter your full name"
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
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
                  Phone Number
                </label>
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
                    className="w-full pl-10 pr-10 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                    placeholder="Min. 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rx-gray-400 hover:text-rx-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
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
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    required
                    className="w-full pl-10 pr-10 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rx-gray-400 hover:text-rx-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms */}
              <p className="text-xs text-rx-gray-400 leading-relaxed">
                By signing up, you agree to ElevateMe&apos;s{" "}
                <a
                  href="https://elevateme.pro/terms-of-use/"
                  target="_blank"
                  className="text-rx-primary hover:underline"
                >
                  Terms of Use
                </a>{" "}
                and{" "}
                <a
                  href="https://elevateme.pro/privacy-policy/"
                  target="_blank"
                  className="text-rx-primary hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </p>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rx-secondary text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#5a8566] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating
                    Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Create Ambassador Account
                  </>
                )}
              </button>
            </form>

            {/* Already have account */}
            <div className="mt-5 pt-4 border-t border-rx-gray-100 text-center">
              <p className="text-sm text-rx-gray-500">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/")}
                  className="text-rx-primary font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Shield className="w-3.5 h-3.5 text-rx-gray-400" />
              <span className="text-xs text-rx-gray-400">
                Your information is secure and encrypted
              </span>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-white/40 text-xs mt-6">
            &copy; 2026 ElevateMe, Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
