import { redirect } from "next/navigation";

export default function ReferralLinkPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  // This page handles /referral?code=XXXX links
  // Redirects to the tracking API which logs the click and redirects to landing
  redirect(`/api/track?code=${encodeURIComponent((searchParams as any).code || "")}`);
}
