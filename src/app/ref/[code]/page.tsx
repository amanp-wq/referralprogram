import { redirect } from "next/navigation";

export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // This page redirects to the tracking API which logs the click and redirects to landing
  // We use a server component to do an immediate redirect
  redirect(`/api/track?code=${encodeURIComponent(code || "")}`);
}
