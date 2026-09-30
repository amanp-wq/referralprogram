import { Gift, CalendarDays, Infinity as InfinityIcon } from "lucide-react";
import { bonus } from "./content";

export function BonusBanner() {
  return (
    <section
      className="em-banner relative overflow-hidden rounded-[18px] text-white"
      style={{
        background:
          "radial-gradient(120% 140% at 0% 100%, #2a6149 0%, rgba(42,97,73,0) 45%), linear-gradient(95deg,#163d2c 0%,#1b4633 55%,#245740 100%)",
        boxShadow: "inset 0 -3px 0 #c7493a, 0 20px 40px -20px rgba(22,61,44,0.7)",
      }}
    >
      <div className="pointer-events-none absolute -right-10 -bottom-16 h-40 w-64 rounded-full bg-[#c7493a]/35 blur-3xl" />
      <span className="em-confetti absolute right-6 top-4 h-4 w-2.5 bg-[#e9a23b]" style={{ ["--r" as string]: "-30deg" }} />
      <span className="em-confetti absolute right-12 bottom-5 h-3.5 w-2 bg-[#c7493a]" style={{ ["--r" as string]: "40deg", animationDelay: "1.2s" }} />

      <div className="em-banner-row relative flex flex-col items-stretch">
        {/* Trophy + challenge */}
        <div className="flex min-w-0 items-center">
          <img src={bonus.trophyImage} alt="Gold trophy" className="em-trophy w-auto shrink-0 self-end py-2 pl-3" draggable={false} />
          <div className="min-w-0 py-4 pr-5 pl-2 sm:pl-3">
            <p className="em-display em-b-label flex items-center gap-2 whitespace-nowrap text-[#e9a23b]">
              <Gift className="h-[1.1em] w-[1.1em] text-[#e0674f]" strokeWidth={2.4} />
              {bonus.label}
            </p>
            <p className="em-display em-b-line1 mt-1 leading-tight">{bonus.line1}</p>
            <p className="em-display em-iphone-text em-b-title whitespace-nowrap leading-[1]">{bonus.line2}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="em-banner-divider bg-white/25" />

        {/* Info */}
        <div className="em-banner-info flex-1 min-w-0 px-5 py-4">
          <div className="em-info-item flex items-center gap-4">
            <CalendarDays className="h-9 w-9 shrink-0 text-white" strokeWidth={1.7} />
            <div>
              <p className="text-[16px] text-white/90">{bonus.periodLabel}</p>
              <p className="text-[16px] font-semibold">{bonus.period}</p>
            </div>
          </div>
          <div className="em-info-item flex items-center gap-4">
            <InfinityIcon className="h-9 w-9 shrink-0 text-[#e9a23b]" strokeWidth={2.4} />
            <div>
              <p className="text-[16px] text-white/90">{bonus.limitLine1}</p>
              <p className="text-[16px] text-white/90">{bonus.limitLine2}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
