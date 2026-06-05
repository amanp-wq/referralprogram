"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Phone, Mail, Loader2, MessageCircle, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const experts = [
  {
    name: "Dhanraj Solanki",
    role: "Team Lead",
    phone: "(614) 559-3815",
    email: "dhanraj.s@elevateme.pro",
    whatsappUrl: "https://wa.me/16145593815",
    initials: "DS",
    color: "from-rx-primary to-rx-primary-dark",
  },
  {
    name: "Meet Patel",
    role: "CSR",
    phone: "(614) 524-5554",
    email: "meet.p@elevateme.pro",
    whatsappUrl: "https://wa.me/16145245554",
    initials: "MP",
    color: "from-rx-secondary to-[#059669]",
  },
];

export function AffiliateHelp() {
  const { token } = useAuth();

  // Contact form state
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!token) return;
    if (!subject.trim() || !message.trim()) {
      setSendError("Please fill in the subject and message fields");
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/affiliate/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, priority, message }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send message");
      }
      toast({ title: "Message sent!", description: "We will get back to you within 24 hours." });
      setSubject("");
      setPriority("medium");
      setMessage("");
    } catch (err: any) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Section with Branding */}
      <div className="bg-gradient-to-br from-rx-primary to-rx-primary-dark rounded-2xl px-8 py-7 text-white relative overflow-hidden">
        <div className="absolute -top-1/2 -right-[20%] w-[400px] h-[400px] bg-white/5 rounded-full" />
        <div className="relative z-10 flex items-center gap-4">
          <img src="/logo.svg" alt="ElevateMe" className="h-10 w-10" />
          <div>
            <h2 className="text-2xl font-bold mb-1">Ambassador Help Center</h2>
            <p className="text-white/85 text-sm">Connect with our experts or send us a message</p>
          </div>
        </div>
      </div>

      {/* Connect with Experts */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-rx-primary-light flex items-center justify-center">
            <User className="w-5 h-5 text-rx-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-rx-gray-800">Connect with Experts</h3>
            <p className="text-sm text-rx-gray-500">Reach out to our team for support and guidance</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {experts.map((expert) => (
            <div
              key={expert.name}
              className="bg-white rounded-2xl p-6 border border-rx-gray-200 hover:shadow-md hover:border-rx-primary/20 transition-all"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${expert.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {expert.initials}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-rx-gray-800">{expert.name}</h4>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rx-primary-light text-rx-primary rounded-full text-xs font-semibold mt-1">
                    {expert.role}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <a
                  href={expert.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl hover:bg-[#25D366]/20 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-rx-gray-800 group-hover:text-[#25D366] transition-colors">
                      {expert.phone}
                    </div>
                    <div className="text-xs text-rx-gray-500">WhatsApp / Phone</div>
                  </div>
                  <Phone className="w-4 h-4 text-rx-gray-400" />
                </a>
                <a
                  href={`mailto:${expert.email}`}
                  className="flex items-center gap-3 px-4 py-3 bg-rx-gray-50 border border-rx-gray-200 rounded-xl hover:bg-rx-primary-light/30 hover:border-rx-primary/20 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-rx-primary flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-rx-gray-800 group-hover:text-rx-primary transition-colors">
                      {expert.email}
                    </div>
                    <div className="text-xs text-rx-gray-500">Email</div>
                  </div>
                  <Mail className="w-4 h-4 text-rx-gray-400" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
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
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What do you need help with?"
              className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light bg-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-sm font-medium text-rx-gray-700 mb-1.5">Message</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            className="w-full px-3.5 py-2.5 border border-rx-gray-200 rounded-lg text-sm focus:outline-none focus:border-rx-primary focus:ring-2 focus:ring-rx-primary-light resize-vertical"
          />
        </div>
        {sendError && (
          <div className="mb-4 p-3 bg-rx-danger-light text-rx-danger text-sm rounded-lg">{sendError}</div>
        )}
        <button
          onClick={handleSendMessage}
          disabled={sending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rx-primary text-white rounded-lg text-sm font-semibold hover:bg-rx-primary-dark disabled:opacity-50"
        >
          {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send Message</>}
        </button>
      </div>
    </div>
  );
}
