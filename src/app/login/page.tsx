"use client";

import { CampaignLayout } from "@/components/referralx/landing/CampaignLayout";
import { LoginCard } from "@/components/referralx/landing/LoginCard";

export default function LoginPage() {
  return (
    // Returning users want to sign in, not scroll past the campaign — card first on phones.
    <CampaignLayout cardFirstOnMobile>
      <LoginCard />
    </CampaignLayout>
  );
}
