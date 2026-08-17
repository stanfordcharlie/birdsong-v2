import Link from "next/link";
import { BirdMark } from "./BirdMark";

// Sticky frosted capsule nav, shared between both landing pages
// (design_handoff_landing_pages_full) — only the cross-link differs.
// LandingPageShell's scroll handler sets data-scrolled="1" past 40px; the
// .lp-navpill rules in globals.css tighten the pill and deepen its shadow
// off that attribute.
//
// "Log in" / "Get started" point at the real auth routes rather than the
// design reference's placeholder href="#", since this renders in the actual
// app, not the prototype.
export function LandingNav({ crossLink }: { crossLink: { label: string; href: string } }) {
  return (
    <nav
      data-landing-nav
      data-scrolled="0"
      className="group/nav sticky top-4 z-[60] mx-auto max-w-[1480px] px-6 pt-4 md:px-10"
    >
      {/* The scrolled state tightens the padding and deepens the hard shadow
          4px -> 6px. The reference swaps in a blurred shadow at this point,
          which is the one place it contradicts its own brief ("no blurred
          shadows on the nav capsule"); the brief wins, so the capsule stays
          hard-shadowed at both sizes. */}
      <div className="lp-navpill flex items-center justify-between gap-6 rounded-full border-2 border-landing-ink bg-[rgba(255,254,250,0.92)] py-[9px] pl-6 pr-[11px] shadow-[4px_4px_0_var(--lp-ink)] backdrop-blur-[18px] group-data-[scrolled=1]/nav:bg-[rgba(255,254,250,0.97)] group-data-[scrolled=1]/nav:py-2 group-data-[scrolled=1]/nav:pl-[22px] group-data-[scrolled=1]/nav:pr-2.5 group-data-[scrolled=1]/nav:shadow-[6px_6px_0_var(--lp-ink)] lp-nav:pl-5">
        <Link href="#top" className="flex items-center gap-[11px]">
          <BirdMark className="shrink-0 motion-safe:animate-[lp-bob_7s_ease_infinite]" />
          <span className="font-bricolage text-[23px] font-bold tracking-[-0.03em]">Birdsong</span>
        </Link>
        {/* ≤920px (design_handoff_landing_mobile): the text links overflowed
            the pill on phones, so they're hidden here entirely rather than
            collapsed into a menu — the primary CTA stays, and the group's
            gap tightens so the pill hugs just the logo and button. */}
        <div className="flex items-center gap-[34px] text-[14.5px] font-medium lp-nav:gap-3">
          <Link href={crossLink.href} className="lp-undl text-landing-muted lp-nav:hidden">
            {crossLink.label}
          </Link>
          <Link href="#how" className="lp-undl text-landing-muted lp-nav:hidden">
            How it works
          </Link>
          <Link href="#queue" className="lp-undl text-landing-muted lp-nav:hidden">
            The handoff
          </Link>
          <Link href="/admin/login" className="lp-undl text-landing-muted lp-nav:hidden">
            Log in
          </Link>
          <Link
            href="/admin/signup"
            className="rounded-full bg-landing-ink px-[22px] py-[11px] font-bold text-landing-bg"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
