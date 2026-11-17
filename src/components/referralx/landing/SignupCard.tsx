"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, ShieldCheck, Copy, CheckCircle2, Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatPhone } from "@/lib/utils";
import { legalLinks } from "./content";

type FieldKey = "name" | "email" | "phone" | "password" | "confirm";
type Errors = Partial<Record<FieldKey, string>>;

function Field({ label, required, icon: Icon, error, children, right }: {
  label: string; required?: boolean; icon: typeof User; error?: string; children: ReactNode; right?: ReactNode;
}) {
  return (
    <div>
      <label className="block text-[15px] font-medium text-[#1e293b]">
        {label} {required && <span className="text-[#e53935]">*</span>}
      </label>
      <div className={`em-input mt-2 flex h-[48px] items-center gap-3 rounded-[8px] border px-4 ${error ? "border-[#e53935] bg-[#ffebee]/50" : "border-[#e2e8f0] bg-[#f8fafc]"}`}>
        <Icon className="h-[18px] w-[18px] shrink-0 text-[#94a3b8]" strokeWidth={1.8} />
        {children}
        {right}
      </div>
      {error && <p className="mt-1 text-[12.5px] text-[#e53935]">{error}</p>}
    </div>
  );
}

const inputCls = "flex-1 min-w-0 bg-transparent text-[15px] text-[#1e293b] placeholder:text-[#94a3b8] outline-none";
const empty = { name: "", email: "", phone: "", password: "", confirm: "" };

export function SignupCard() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [show, setShow] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ firstName: string; referralCode: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: FieldKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = k === "phone" ? formatPhone(e.target.value) : e.target.value;
    setForm({ ...form, [k]: value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.name.trim().length < 2) e.name = "Please enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Please enter a valid email address";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.confirm) e.confirm = "Please confirm your password";
    else if (form.confirm !== form.password) e.confirm = "Passwords do not match";
    return e;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError("");
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email, phone: form.phone.trim() || undefined, password: form.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Failed to create account. Please try again.";
        if (res.status === 409) setErrors({ email: msg });
        else setFormError(msg);
        return;
      }
      if (data.token) {
        localStorage.setItem("elevateme_token", data.token);
        await login(email, form.password);
      }
      setCreated({ firstName: form.name.trim().split(" ")[0], referralCode: data.affiliate?.referralCode || "" });
      setForm(empty);
    } catch {
      setFormError("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (!created?.referralCode) return;
    navigator.clipboard?.writeText(created.referralCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const eye = (k: "password" | "confirm") => (
    <button
      type="button"
      onClick={() => setShow({ ...show, [k]: !show[k] })}
      className="text-[#94a3b8] hover:text-[#488a6d] transition-colors"
      aria-label={show[k] ? "Hide password" : "Show password"}
    >
      {show[k] ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />}
    </button>
  );

  return (
    <div className="w-full">
      <div
        className="em-rise rounded-[22px] bg-white px-6 sm:px-[30px] pt-6 pb-8 shadow-[0_24px_60px_-28px_rgba(60,40,30,0.35)] border border-[#f1ece8]"
        style={{ animationDelay: "0.3s" }}
        id="signup"
      >
        {/* Header */}
        <div className="flex items-center gap-4 pb-5 border-b border-[#eef0f3]">
          <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full bg-[#e8f3eb]">
            <UserPlus className="h-6 w-6 text-[#488a6d]" strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="em-display text-[20px] text-[#161616]" style={{ letterSpacing: "-0.01em" }}>Create Your Account</h2>
            <p className="text-[14px] text-[#64748b]">Join as an ElevateMe Ambassador</p>
          </div>
        </div>

        {created ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-[#488a6d]" strokeWidth={1.8} />
            <h3 className="em-display mt-4 text-[22px] text-[#161616]" style={{ letterSpacing: "-0.01em" }}>You&apos;re in, {created.firstName}!</h3>
            <p className="mt-2 text-[15px] text-[#64748b]">Share your referral code with students to start earning.</p>
            {created.referralCode && (
              <div className="mt-6 flex items-center justify-between rounded-[10px] border border-dashed border-[#c7493a]/50 bg-[#fdecea] px-4 py-3">
                <span className="font-mono text-[18px] font-bold tracking-wider text-[#c7493a]">{created.referralCode}</span>
                <button onClick={copyCode} className="flex items-center gap-1.5 text-[14px] font-semibold text-[#488a6d] hover:text-[#3a7058]">
                  <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
            <button
              onClick={() => router.push("/app")}
              className="em-shine mt-6 flex h-[48px] w-full items-center justify-center gap-2 rounded-[8px] text-[16px] font-semibold text-white hover:brightness-110"
              style={{ background: "linear-gradient(180deg,#6e9e7b 0%,#5a8566 100%)" }}
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-[18px]">
            {formError && (
              <div className="flex items-center gap-2 rounded-lg bg-[#ffebee] px-4 py-3 text-sm font-medium text-[#e53935]">
                <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
              </div>
            )}
            <Field label="Full Name" required icon={User} error={errors.name}>
              <input className={inputCls} placeholder="Enter your full name" value={form.name} onChange={set("name")} autoComplete="name" />
            </Field>
            <Field label="Email Address" required icon={Mail} error={errors.email}>
              <input type="email" className={inputCls} placeholder="you@example.com" value={form.email} onChange={set("email")} autoComplete="email" />
            </Field>
            <Field label="Phone Number" icon={Phone} error={errors.phone}>
              <input type="tel" className={inputCls} placeholder="(555) 123-4567" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </Field>
            <Field label="Password" required icon={Lock} error={errors.password} right={eye("password")}>
              <input type={show.password ? "text" : "password"} className={inputCls} placeholder="Min. 8 characters" value={form.password} onChange={set("password")} autoComplete="new-password" />
            </Field>
            <Field label="Confirm Password" required icon={Lock} error={errors.confirm} right={eye("confirm")}>
              <input type={show.confirm ? "text" : "password"} className={inputCls} placeholder="Re-enter your password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
            </Field>

            <p className="pt-1 text-[14px] leading-[1.6] text-[#64748b]">
              By signing up, you agree to ElevateMe&apos;s{" "}
              <a href={legalLinks.terms} target="_blank" rel="noopener noreferrer" className="text-[#c7493a] hover:underline underline-offset-2">Terms of Use</a>{" "}
              and{" "}
              <a href={legalLinks.privacy} target="_blank" rel="noopener noreferrer" className="text-[#c7493a] hover:underline underline-offset-2">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="em-shine flex h-[52px] w-full items-center justify-center gap-3 rounded-[8px] text-[17px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(72,138,109,0.9)] transition-[filter,box-shadow] duration-200 hover:brightness-110 disabled:opacity-80"
              style={{ background: "linear-gradient(180deg,#6e9e7b 0%,#5a8566 100%)" }}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" strokeWidth={2} />}
              {loading ? "Creating Account..." : "Create Ambassador Account"}
            </button>
          </form>
        )}

        <div className="mt-7 border-t border-[#eef0f3] pt-6 text-center">
          <p className="text-[15px] text-[#334155]">
            Already have an account?{" "}
            <button onClick={() => router.push("/login")} className="text-[17px] font-semibold text-[#c7493a] hover:underline underline-offset-2">
              Sign In
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
