import Link from "next/link";

export function HeroSection({
  eyebrow,
  h1,
  subhead,
  subheadMaxWidth = 560,
}: {
  eyebrow?: string;
  h1: string;
  subhead: string;
  subheadMaxWidth?: number;
}) {
  // With an eyebrow line the whole stack shifts to a tighter fadeUp stagger
  // (0 / .06s / .14s / .22s); without one, h1 leads at 0 / .12s / .22s.
  const delays = eyebrow
    ? { eyebrow: "0s", h1: "0.06s", subhead: "0.14s", buttons: "0.22s" }
    : { h1: "0s", subhead: "0.12s", buttons: "0.22s" };

  return (
    // Outer container matches the 1360px section width (with 48px side
    // padding) so the hero belongs to the same grid as nav/sections; the
    // 880px inner block is the text measure, centered as before.
    <header id="top" className="mx-auto max-w-[1360px] px-12 pb-6 pt-[72px] max-md:px-8">
      <div className="mx-auto max-w-[880px] text-center">
      {eyebrow && (
        <p
          className="mb-[18px] text-[13px] uppercase tracking-[0.14em] text-[#33684B]"
          style={{ animation: `fadeUp 0.8s ${delays.eyebrow} both` }}
        >
          {eyebrow}
        </p>
      )}
      <h1
        className="text-balance font-newsreader text-[clamp(42px,6.4vw,74px)] font-medium leading-[1.04] tracking-[-0.02em] text-[#211D16]"
        style={{ animation: `fadeUp 0.8s ${delays.h1} both` }}
      >
        {h1}
      </h1>
      <p
        className="text-pretty mx-auto mt-[22px] text-[19px] leading-[1.6] text-[#5D5748]"
        style={{ maxWidth: `${subheadMaxWidth}px`, animation: `fadeUp 0.8s ${delays.subhead} both` }}
      >
        {subhead}
      </p>
      <div
        className="mt-8 flex justify-center gap-3.5"
        style={{ animation: `fadeUp 0.8s ${delays.buttons} both` }}
      >
        <Link
          href="/admin/signup"
          className="rounded-lg bg-[#211D16] px-[26px] py-[13px] text-[15px] font-medium text-[#F5EFE3] transition-colors hover:bg-[#3A342A]"
        >
          Get started
        </Link>
        <Link
          href="#how"
          className="rounded-lg border border-[rgba(33,29,22,0.2)] px-[22px] py-[13px] text-[15px] font-medium text-[#211D16] transition-colors hover:border-[#211D16]"
        >
          See how it works
        </Link>
      </div>
      </div>
    </header>
  );
}
