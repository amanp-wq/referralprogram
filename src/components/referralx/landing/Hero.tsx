import { CalendarDays } from "lucide-react";
import { campaign, hero } from "./content";

const confetti = [
  { l: "4%", t: "12%", c: "#c7493a", w: 10, h: 16, r: "25deg", d: "0s" },
  { l: "94%", t: "6%", c: "#e9a23b", w: 8, h: 14, r: "-30deg", d: "1s" },
  { l: "2%", t: "44%", c: "#689775", w: 8, h: 18, r: "50deg", d: "0.5s" },
  { l: "95%", t: "50%", c: "#c7493a", w: 9, h: 14, r: "15deg", d: "2s" },
  { l: "90%", t: "80%", c: "#689775", w: 10, h: 16, r: "-40deg", d: "1.5s" },
];

export function Hero() {
  return (
    <section className="em-hero">
      <div className="em-hero-inner">
        {/* Text column */}
        <div className="em-hero-text relative z-10">
          <div className="em-rise" style={{ animationDelay: "0.05s" }}>
            <img src="/logo.svg" alt="ElevateMe" className="em-logo" draggable={false} />
          </div>
          <p className="em-rise em-kicker mt-4 font-semibold text-[#1d1d1d]" style={{ animationDelay: "0.15s" }}>
            AMBASSADOR CHALLENGE
          </p>
          <div
            className="em-rise em-pill mt-2 inline-flex items-center gap-[0.55em] rounded-full text-white shadow-[0_8px_20px_-8px_rgba(199,73,58,0.7)]"
            style={{ animationDelay: "0.25s", background: "linear-gradient(180deg,#d25a4a 0%,#b33f31 100%)" }}
          >
            <CalendarDays className="h-[1em] w-[1em]" strokeWidth={2} />
            <span className="em-display whitespace-nowrap" style={{ letterSpacing: "0.01em" }}>
              {campaign.dateRange}
            </span>
          </div>

          <h1 className="em-display em-headline mt-[0.3em] leading-[0.95]">
            <span className="em-rise block whitespace-nowrap text-[#161616]" style={{ animationDelay: "0.35s" }}>
              {hero.line1}
            </span>
            <span className="em-rise block whitespace-nowrap" style={{ animationDelay: "0.45s" }}>
              <span className="em-red-text">{hero.line2}</span>
            </span>
          </h1>

          <p className="em-rise em-subcopy mt-[1.1em] leading-[1.38] text-[#222]" style={{ animationDelay: "0.55s" }}>
            {hero.copyStart}{" "}
            <span className="font-semibold text-[#c7493a] text-[1.12em] whitespace-nowrap">{hero.highlight}</span>{" "}
            {hero.copyEnd}
          </p>
        </div>

        {/* Phone visual */}
        <div className="em-hero-phone relative z-0">
          {confetti.map((c, i) => (
            <span
              key={i}
              className="em-confetti hidden sm:block"
              style={{ left: c.l, top: c.t, width: c.w, height: c.h, background: c.c, ["--r" as string]: c.r, animationDelay: c.d }}
            />
          ))}
          <img
            src={hero.phoneImage}
            alt="iPhone 18 Pro reward"
            className="em-phone relative block w-full h-auto"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
