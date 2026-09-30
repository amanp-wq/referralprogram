import { Fragment } from "react";
import { UserPlus, GraduationCap, DollarSign, Users, ArrowRight } from "lucide-react";
import { steps, rewards, type StepIcon, type Tone } from "./content";

const icons: Record<StepIcon, typeof UserPlus> = { UserPlus, GraduationCap, DollarSign, Users };

const TONE_BG: Record<Tone, string> = {
  red: "linear-gradient(160deg,#d8624f 0%,#b33f31 100%)",
  green: "linear-gradient(160deg,#7aa887 0%,#488a6d 100%)",
};

function IconCircle({ name, tone, size = 60 }: { name: StepIcon; tone: Tone; size?: number }) {
  const Icon = icons[name];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.35)]"
      style={{ width: size, height: size, background: TONE_BG[tone] }}
    >
      <Icon className="h-[46%] w-[46%]" strokeWidth={2.2} />
    </div>
  );
}

function StepCard({ step }: { step: (typeof steps)[number] }) {
  return (
    <div className="em-card-hover flex-1 min-w-0 rounded-[14px] bg-white/95 px-4 lg:px-[18px] py-4 sm:py-5 shadow-[0_6px_24px_-14px_rgba(60,40,30,0.25)] border border-[#f1ece8]">
      <IconCircle name={step.icon} tone={step.tone} />
      <h3 className="mt-4 text-[18px] font-bold leading-[1.15] text-[#161616]">{step.title}</h3>
      <p className="mt-3 text-[14.5px] leading-[1.4] text-[#64748b]">{step.text}</p>
    </div>
  );
}

function Arrow({ extra = "" }: { extra?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center py-1 sm:py-0 ${extra}`}>
      <ArrowRight className="em-arrow h-7 w-7 text-[#c7493a] rotate-90 sm:rotate-0" strokeWidth={2.4} />
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="grid grid-cols-1 min-[1400px]:grid-cols-[1.31fr_1fr] gap-6 sm:gap-4 min-[1400px]:gap-[6px]">
      {/* Steps */}
      <div className="min-w-0 rounded-[18px] bg-white/60 backdrop-blur-sm border border-white/70 px-4 sm:px-[18px] pt-5 pb-3 shadow-[0_10px_30px_-20px_rgba(60,40,30,0.3)]">
        <h2 className="pl-1 text-[16px] sm:text-[17px] font-bold tracking-[0.34em] text-[#161616]">HOW IT WORKS</h2>
        <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-2">
          <StepCard step={steps[0]} />
          <Arrow />
          <StepCard step={steps[1]} />
          <Arrow extra="hidden min-[1400px]:flex" />
        </div>
      </div>

      {/* Rewards */}
      <div
        className="min-w-0 rounded-[18px] border-2 border-[#f6d3cc] px-4 sm:px-5 pt-4 sm:pt-3 pb-5 shadow-[0_10px_30px_-20px_rgba(199,73,58,0.35)]"
        style={{ background: "linear-gradient(180deg,#fff5f3 0%,#fdecea 100%)" }}
      >
        <h2 className="text-center text-[15px] sm:text-[16px] font-bold tracking-[0.04em] text-[#c7493a]">{rewards.title}</h2>

        {/* 3-col grid keeps icons, pills and text aligned even when titles wrap */}
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] gap-x-2 sm:gap-x-3 gap-y-2">
          <div className="relative" style={{ gridColumn: 2, gridRow: "1 / 4" }}>
            <div className="absolute left-1/2 top-2 bottom-0 w-px -translate-x-1/2 bg-[#c7493a]/40" />
          </div>

          {rewards.options.map((opt, idx) => {
            const col = idx === 0 ? 1 : 3;
            return (
              <Fragment key={opt.id}>
                <div className="flex flex-col items-center text-center" style={{ gridColumn: col, gridRow: 1 }}>
                  <IconCircle name={opt.icon} tone={opt.tone} size={48} />
                  <p className="mt-2 text-[15px] sm:text-[16.5px] font-semibold leading-tight text-[#161616]">{opt.title}</p>
                </div>
                <div
                  className={`self-center rounded-full py-2 px-2 text-center text-[17px] sm:text-[19px] font-bold whitespace-nowrap transition-transform duration-300 hover:scale-[1.04] ${
                    opt.tone === "red"
                      ? "bg-[#f7d4c8] text-[#161616] shadow-[inset_0_-2px_0_rgba(199,73,58,0.15)]"
                      : "text-white shadow-[0_8px_18px_-10px_rgba(72,138,109,0.8)]"
                  }`}
                  style={{
                    gridColumn: col,
                    gridRow: 2,
                    ...(opt.tone === "green" ? { background: "linear-gradient(180deg,#5f9270 0%,#488a6d 100%)" } : {}),
                  }}
                >
                  {opt.amount}
                </div>
                <p className="mt-1 text-[13px] sm:text-[14px] leading-[1.35] text-[#555]" style={{ gridColumn: col, gridRow: 3 }}>
                  {opt.text}
                </p>
              </Fragment>
            );
          })}

          <div className="relative z-10 flex items-center justify-center" style={{ gridColumn: 2, gridRow: 2 }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fce5e1] border border-[#f3c6be] text-[12px] font-bold text-[#c7493a]">
              OR
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
