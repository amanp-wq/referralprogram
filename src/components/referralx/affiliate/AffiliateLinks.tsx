"use client";

import { useAuth } from "@/contexts/AuthContext";
import { CopyButton } from "../shared";
import {
  Link2, ExternalLink, Share2, MessageCircle, Info,
} from "lucide-react";

export function AffiliateLinks() {
  const { affiliate, user } = useAuth();

  // Build referral code: First Name first letter + Last Name first letter + Phone last 4 digits
  const generateReferralCodeDisplay = () => {
    const name = user?.name || "";
    const phone = user?.phone || "";
    const nameParts = name.split(" ").filter(Boolean);
    const firstInitial = nameParts[0] ? nameParts[0][0].toUpperCase() : "X";
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1][0].toUpperCase() : "X";
    const phoneDigits = phone.replace(/\D/g, "");
    const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "0000";
    return `${firstInitial}${lastInitial}${last4}`;
  };

  const referralLink = affiliate
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${affiliate.referralCode}`
    : "";

  const referralCodeDisplay = generateReferralCodeDisplay();

  // Social share helpers
  const shareMessage = `Join ElevateMe using my referral link! 🚀`;
  const shareSubject = "Join ElevateMe - Referral Invitation";

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage + " " + referralLink)}`, "_blank");
  };
  const shareOnFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, "_blank");
  };
  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`, "_blank");
  };
  const shareOnLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, "_blank");
  };
  const shareViaEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareMessage + "\n\n" + referralLink)}`;
  };

  return (
    <div className="space-y-6">
      {/* Hero Card with Unique Referral Link */}
      <div className="bg-gradient-to-br from-rx-primary to-rx-primary-dark rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute -top-1/4 -right-[10%] w-[300px] h-[300px] bg-white/5 rounded-full" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-white/3 rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <img src="/logo.svg" alt="ElevateMe" className="h-10 w-10" />
            <div>
              <h2 className="text-2xl font-bold">Your Unique Ambassador Link</h2>
              <p className="text-white/70 text-sm">Share this link to start earning commissions</p>
            </div>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-xl p-5 mb-5">
            <div className="text-xs text-white/60 mb-2 font-medium uppercase tracking-wider">Referral Link</div>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-3 border border-white/20 rounded-lg font-mono text-sm bg-white/10 text-white"
              />
              <CopyButton text={referralLink} label={<><ExternalLink className="w-4 h-4" /> Copy</>} />
            </div>
          </div>
          {affiliate && (
            <div className="flex gap-6 pt-4 border-t border-white/20">
              <div>
                <div className="text-white/60 text-xs">Your Code</div>
                <div className="text-white font-bold font-mono text-lg">{affiliate.referralCode}</div>
              </div>
              <div>
                <div className="text-white/60 text-xs">Tier</div>
                <div className="text-white font-bold capitalize text-lg">{affiliate.tier}</div>
              </div>
              <div>
                <div className="text-white/60 text-xs">Commission</div>
                <div className="text-white font-bold text-lg">{affiliate.commissionRate}%</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Social Share Section */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-rx-primary-light flex items-center justify-center">
            <Share2 className="w-5 h-5 text-rx-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-rx-gray-800">Share Your Link</h3>
            <p className="text-sm text-rx-gray-500">Spread the word through your favorite platforms</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <button
            onClick={shareOnWhatsApp}
            className="flex items-center gap-3 px-5 py-4 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-rx-gray-800 group-hover:text-[#25D366] transition-colors">WhatsApp</div>
              <div className="text-xs text-rx-gray-500">Share via chat</div>
            </div>
          </button>
          <button
            onClick={shareOnFacebook}
            className="flex items-center gap-3 px-5 py-4 bg-[#1877F2]/10 border border-[#1877F2]/20 rounded-xl hover:bg-[#1877F2]/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-rx-gray-800 group-hover:text-[#1877F2] transition-colors">Facebook</div>
              <div className="text-xs text-rx-gray-500">Post to feed</div>
            </div>
          </button>
          <button
            onClick={shareOnTwitter}
            className="flex items-center gap-3 px-5 py-4 bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 rounded-xl hover:bg-[#1DA1F2]/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1DA1F2] flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-rx-gray-800 group-hover:text-[#1DA1F2] transition-colors">Twitter/X</div>
              <div className="text-xs text-rx-gray-500">Tweet your link</div>
            </div>
          </button>
          <button
            onClick={shareOnLinkedIn}
            className="flex items-center gap-3 px-5 py-4 bg-[#0A66C2]/10 border border-[#0A66C2]/20 rounded-xl hover:bg-[#0A66C2]/20 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-rx-gray-800 group-hover:text-[#0A66C2] transition-colors">LinkedIn</div>
              <div className="text-xs text-rx-gray-500">Share professionally</div>
            </div>
          </button>
          <button
            onClick={shareViaEmail}
            className="flex items-center gap-3 px-5 py-4 bg-rx-gray-50 border border-rx-gray-200 rounded-xl hover:bg-rx-gray-100 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-rx-gray-600 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-rx-gray-800 group-hover:text-rx-primary transition-colors">Email</div>
              <div className="text-xs text-rx-gray-500">Send an email</div>
            </div>
          </button>
        </div>
      </div>

      {/* Referral Code Info Card */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-rx-info-light flex items-center justify-center">
            <Info className="w-5 h-5 text-rx-info" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-rx-gray-800">Referral Code Information</h3>
            <p className="text-sm text-rx-gray-500">How your unique code was generated</p>
          </div>
        </div>
        <div className="bg-rx-gray-50 rounded-xl p-5">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-rx-primary-light border-2 border-rx-primary/20 rounded-xl px-8 py-4">
              <div className="text-xs text-rx-primary font-medium uppercase tracking-wider mb-1">Your Referral Code</div>
              <div className="text-3xl font-bold font-mono text-rx-primary tracking-widest">{referralCodeDisplay}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white rounded-lg p-4 border border-rx-gray-200">
              <div className="text-xs text-rx-gray-500 font-medium mb-1">First Initial</div>
              <div className="text-lg font-bold text-rx-gray-800">
                {user?.name ? user.name.split(" ")[0]?.[0]?.toUpperCase() || "X" : "X"}
              </div>
              <div className="text-xs text-rx-gray-400 mt-1">
                From &quot;{(user?.name || "").split(" ")[0] || "Unknown"}&quot;
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-rx-gray-200">
              <div className="text-xs text-rx-gray-500 font-medium mb-1">Last Initial</div>
              <div className="text-lg font-bold text-rx-gray-800">
                {user?.name ? (user.name.split(" ").filter(Boolean).length > 1 ? user.name.split(" ").filter(Boolean).slice(-1)[0][0].toUpperCase() : "X") : "X"}
              </div>
              <div className="text-xs text-rx-gray-400 mt-1">
                From &quot;{user?.name ? (user.name.split(" ").filter(Boolean).length > 1 ? user.name.split(" ").filter(Boolean).slice(-1)[0] : "N/A") : "N/A"}&quot;
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-rx-gray-200">
              <div className="text-xs text-rx-gray-500 font-medium mb-1">Phone Last 4</div>
              <div className="text-lg font-bold text-rx-gray-800">
                {user?.phone ? user.phone.replace(/\D/g, "").slice(-4) || "0000" : "0000"}
              </div>
              <div className="text-xs text-rx-gray-400 mt-1">
                From &quot;{user?.phone || "N/A"}&quot;
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-rx-info-light rounded-lg">
            <p className="text-xs text-rx-info leading-relaxed">
              <strong>Format:</strong> First Name first letter + Last Name first letter + Phone last 4 digits.
              Example: &quot;JD5554&quot; for John Doe with phone ending in 5554.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
