"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  UserPlus, CheckCircle, AlertCircle, Loader2, ArrowRight, Shield, Phone, Mail, User,
} from "lucide-react";

function EnrollForm() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";
  const source = searchParams.get("source") || "direct";
  const ambassadorName = searchParams.get("ref") || "";

  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If no code, redirect to home
    if (!code) {
      window.location.href = "/";
    }
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralCode: code,
          visitorEmail: form.email,
          visitorName: form.name,
          visitorPhone: form.phone,
          source,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-rx-secondary-light flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-rx-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-rx-gray-900 font-heading mb-2">
              You&apos;re Enrolled!
            </h2>
            <p className="text-rx-gray-500 mb-2">
              Thank you, <strong className="text-rx-gray-800">{form.name}</strong>! Your referral has been successfully submitted.
            </p>
            <p className="text-rx-gray-400 text-sm mb-6">
              Our team will reach out to you soon at <strong>{form.email}</strong>.
            </p>
            <div className="bg-rx-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-rx-gray-500">
                You were referred by <strong className="text-rx-primary">{ambassadorName || "an ElevateMe Ambassador"}</strong>
              </p>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rx-primary text-white rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-colors"
            >
              Go to Homepage <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="ElevateMe" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-rx-gray-900 font-heading mb-2">
            Join ElevateMe
          </h1>
          <p className="text-rx-gray-500 text-sm">
            {ambassadorName
              ? `You were referred by ${ambassadorName}`
              : "You've been referred by an ElevateMe Ambassador"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-rx-gray-100">
            <div className="w-11 h-11 rounded-xl bg-rx-primary-light flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-rx-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rx-gray-900">Submit Your Reference</h3>
              <p className="text-xs text-rx-gray-500">Fill in your info to complete the referral</p>
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
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">
                Phone Number <span className="text-rx-danger">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rx-gray-400" />
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-rx-gray-200 rounded-lg text-sm bg-rx-gray-50 focus:outline-none focus:border-rx-primary focus:bg-white focus:ring-[3px] focus:ring-rx-primary-light transition-all"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* Referral Code is hidden from submitter */}
            <input type="hidden" value={code} name="referralCode" />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rx-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-rx-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Submit Your Reference
                </>
              )}
            </button>
          </form>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-rx-gray-100">
            <Shield className="w-3.5 h-3.5 text-rx-gray-400" />
            <span className="text-xs text-rx-gray-400">Your information is secure and will not be shared</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-rx-gray-400 text-xs mt-6">
          &copy; 2026 ElevateMe. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function EnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-rx-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-rx-primary animate-spin" />
        </div>
      }
    >
      <EnrollForm />
    </Suspense>
  );
}
