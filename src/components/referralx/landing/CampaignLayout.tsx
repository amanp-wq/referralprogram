import type { ReactNode } from "react";
import "./landing.css";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { BonusBanner } from "./BonusBanner";
import { campaign } from "./content";

// Ambassador Challenge page shell: campaign content on the left, an auth
// card (signup or sign-in) on the right. Shared by / and /login.
export function CampaignLayout({ children, cardFirstOnMobile = false }: { children: ReactNode; cardFirstOnMobile?: boolean }) {
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
            <Hero hideLogoOnMobile={cardFirstOnMobile} />
            <div className="xl:mt-[40px] relative z-10">
              <HowItWorks />
            </div>
            <div className="xl:mt-[24px]">
              <BonusBanner />
            </div>
          </div>

          {/* Right column — auth card (optionally shown above the campaign on narrow screens) */}
          <aside className={`min-w-0 w-full max-w-[560px] mx-auto xl:max-w-none xl:pt-[32px] ${cardFirstOnMobile ? "order-first xl:order-none" : ""}`}>
            <div className="xl:sticky xl:top-6">
              {cardFirstOnMobile && (
                <img src="/logo.svg" alt="ElevateMe" className="xl:hidden mb-6 h-9 sm:h-11 w-auto" draggable={false} />
              )}
              {children}
              <p className={`mt-6 sm:mt-9 text-center text-[13.5px] text-[#94a3b8] ${cardFirstOnMobile ? "hidden xl:block" : ""}`}>{campaign.copyright}</p>
            </div>
          </aside>
        </div>
        {cardFirstOnMobile && (
          <p className="xl:hidden mt-6 sm:mt-9 text-center text-[13.5px] text-[#94a3b8]">{campaign.copyright}</p>
        )}
      </div>
    </main>
  );
}
