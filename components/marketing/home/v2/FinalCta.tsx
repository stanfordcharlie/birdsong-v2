import { hpPrimary } from "./buttons";

/**
 * Final CTA: three rotated cards on the left, a tinted panel on the right
 * that slides 40px under them.
 *
 * The overlap and the compensating left padding are both ≥900px only — once
 * the two columns stack, pulling the panel left would just crop it.
 */
export function FinalCta() {
  return (
    <section
      id="demo"
      className="mx-auto grid max-w-[1200px] grid-cols-1 items-center px-[24px] pb-[160px] hp-wide:grid-cols-2"
    >
      <div className="relative z-[2] h-[clamp(300px,34vw,440px)]">
        <div className="absolute left-[12%] top-0 h-[74%] w-[82%] rotate-[-4deg] rounded-[12px] bg-hp-green-pale shadow-[0_14px_40px_rgba(27,31,28,0.12)]" />
        <div className="absolute left-0 top-[14%] h-[74%] w-[84%] rotate-[-2deg] rounded-[12px] bg-hp-green shadow-[0_14px_40px_rgba(27,31,28,0.14)]" />
        <div className="absolute left-[8%] top-[26%] flex h-[74%] w-[86%] rotate-[2deg] flex-col justify-end gap-[12px] rounded-[12px] bg-hp-note-yellow p-[clamp(24px,4vw,48px)] shadow-[0_18px_50px_rgba(27,31,28,0.18)]">
          <div className="absolute right-[clamp(24px,4vw,48px)] top-[clamp(20px,3vw,36px)] rotate-[-10deg] font-hp-hand text-[clamp(28px,3vw,44px)] font-semibold">
            ↗
          </div>
          <div className="font-hp-serif text-[clamp(34px,4.2vw,60px)] leading-[0.98] tracking-[-0.02em]">
            Turn Audience
            <br />
            Into Pipeline
          </div>
        </div>
      </div>
      <div className="mt-[24px] flex min-h-[280px] flex-col items-start justify-center gap-[28px] rounded-[8px] bg-hp-tint px-[clamp(32px,5vw,80px)] py-[clamp(40px,5vw,72px)] hp-wide:-ml-[40px] hp-wide:mt-0 hp-wide:pl-[clamp(72px,8vw,120px)]">
        <div className="flex flex-col gap-[6px] text-[clamp(20px,2vw,28px)] leading-[1.3] text-hp-body">
          <span>Your next pipeline is already talking.</span>
          <span>Revenue teams are turning audiences into qualified conversations with Birdsong.</span>
        </div>
        <a href="/admin/signup" className={`${hpPrimary} px-[22px] py-[13px] text-[17px]`}>
          Get started today
        </a>
      </div>
    </section>
  );
}
