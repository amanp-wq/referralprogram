"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Send, BookOpen, Link2, CreditCard, Shield } from "lucide-react";

const categories = [
  { icon: <BookOpen className="w-5 h-5" />, color: "bg-rx-primary-light text-rx-primary", title: "Getting Started", desc: "Learn the basics of using ElevateMe Referral", articles: 5 },
  { icon: <Link2 className="w-5 h-5" />, color: "bg-rx-secondary-light text-rx-secondary", title: "Links & Tracking", desc: "Create and manage your referral links", articles: 8 },
  { icon: <CreditCard className="w-5 h-5" />, color: "bg-rx-warning-light text-rx-warning", title: "Payments & Payouts", desc: "Understand your earnings and payouts", articles: 6 },
  { icon: <Shield className="w-5 h-5" />, color: "bg-rx-danger-light text-rx-danger", title: "Account & Security", desc: "Manage your account and privacy", articles: 4 },
];

const faqs = [
  { q: "How do I create a referral link?", a: "Navigate to the My Links page and click the Create Link button. You can customize the link label and assign it to a specific program. Your unique referral code will be embedded in the link automatically." },
  { q: "When do I get paid?", a: "Payouts are processed on a monthly basis, typically on the 15th of each month. You must have a minimum balance of $50.00 to request a payout. The processing time depends on your selected payout method (3-5 business days for bank transfer, 1-2 days for PayPal)." },
  { q: "How are commissions calculated?", a: "Commissions are calculated based on the program commission structure. For percentage-based programs, you earn a percentage of each sale. For fixed-amount programs, you earn a fixed amount per conversion. Your commission rate is determined by your affiliate tier." },
  { q: "Can I track my referral performance?", a: "Yes! Your Dashboard shows real-time statistics including clicks, conversions, and earnings. You can also view detailed analytics on the Earnings page and track individual link performance on the My Links page." },
  { q: "What happens if a referral is refunded?", a: "If a referred customer requests a refund, the corresponding commission will be deducted from your pending balance. The referral status will be updated to 'Refunded' and you'll be notified via email if payout alerts are enabled." },
  { q: "How do I change my payout method?", a: "Go to Settings and select your preferred payout method under the Payout Method section. You can choose between Bank Transfer, PayPal, or UPI. Make sure to fill in the required details for your selected method." },
  { q: "What is the ElevateMe referral program?", a: "ElevateMe Referral is a comprehensive platform that allows you to earn commissions by referring customers to products and services. You get a unique referral link to share, and earn money whenever someone makes a purchase through your link." },
];

export function AffiliateHelp() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-6">
      {/* Hero Section with Branding */}
      <div className="bg-gradient-to-br from-rx-primary to-rx-primary-dark rounded-2xl px-8 py-7 text-white relative overflow-hidden">
        <div className="absolute -top-1/2 -right-[20%] w-[400px] h-[400px] bg-white/5 rounded-full" />
        <div className="relative z-10 flex items-center gap-4">
          <img src="/logo.svg" alt="ElevateMe" className="h-10 w-10" />
          <div>
            <h2 className="text-2xl font-bold mb-1">Help Center</h2>
            <p className="text-white/85 text-sm">Find answers to common questions and get support</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {categories.map((cat) => (
          <div
            key={cat.title}
            className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-md hover:border-rx-primary/30 transition-all cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${cat.color}`}>
              {cat.icon}
            </div>
            <h4 className="font-semibold text-rx-gray-800 mb-1">{cat.title}</h4>
            <p className="text-xs text-rx-gray-500 mb-3 leading-relaxed">{cat.desc}</p>
            <span className="text-xs text-rx-primary font-semibold">{cat.articles} articles</span>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl border border-rx-gray-200 p-6">
        <h3 className="text-lg font-semibold text-rx-gray-800 mb-5">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-rx-gray-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-rx-gray-50"
              >
                <span className="text-sm font-medium text-rx-gray-800">{faq.q}</span>
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-rx-primary flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-rx-gray-400 flex-shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-rx-gray-600 leading-relaxed border-t border-rx-gray-50 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-white rounded-2xl p-6 border border-rx-gray-200">
        <div className="flex items-center gap-3 mb-1">
          <img src="/logo.svg" alt="ElevateMe" className="h-6 w-6" />
          <h3 className="text-lg font-semibold text-rx-gray-800">Still Need Help?</h3>
        </div>
        <p className="text-sm text-rx-gray-500 mb-6">Send us a message and we will get back to you within 24 hours</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Subject</label>
            <input
              type="text"
              placeholder="What do you need help with?"
              className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Priority</label>
            <select className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light bg-white">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Message</label>
          <textarea
            rows={4}
            placeholder="Describe your issue in detail..."
            className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light resize-vertical"
          />
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark">
          <Send className="w-4 h-4" /> Send Message
        </button>
      </div>
    </div>
  );
}
