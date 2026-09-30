"use client";

import "@/components/referralx/landing/landing.css";
import { Hero } from "@/components/referralx/landing/Hero";
import { HowItWorks } from "@/components/referralx/landing/HowItWorks";
import { BonusBanner } from "@/components/referralx/landing/BonusBanner";
import { SignupCard } from "@/components/referralx/landing/SignupCard";
import { campaign } from "@/components/referralx/landing/content";

// Ambassador signup — Ambassador Challenge campaign landing page.
export default function SignupPage() {
  return (
    <main className="em-page">
      <div className="em-bg" aria-hidden="true">
        <span className="peach-1" />
        <span className="peach-3" />
        <span className="green-2" />
        <span className="green-1" />
        <span className="peach-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-[4%] pt-10 lg:pt-[46px] pb-10">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px] gap-6 sm:gap-10 xl:gap-8 2xl:gap-[40px]">
          {/* Left column — campaign */}
          <div className="min-w-0 w-full max-w-[980px] mx-auto xl:max-w-none flex flex-col gap-6 xl:gap-0">
            <Hero />
            <div className="xl:mt-[40px] relative z-10">
              <HowItWorks />
            </div>
            <div className="xl:mt-[24px]">
              <BonusBanner />
            </div>
          </div>

          {/* Right column — signup */}
          <aside className="min-w-0 w-full max-w-[560px] mx-auto xl:max-w-none xl:pt-[32px]">
            <div className="xl:sticky xl:top-6">
              <SignupCard />
              <p className="mt-6 sm:mt-9 text-center text-[13.5px] text-[#94a3b8]">{campaign.copyright}</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
