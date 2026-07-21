import Link from "next/link";
import { BirdMark } from "./BirdMark";

// Sticky frosted capsule nav, shared between both landing pages
// (design_handoff_landing_pages_full) — only the cross-link differs.
// "Log in" / "Get started" point at the real auth routes rather than the
// design reference's placeholder `href="#"`, since this renders in the
// actual app, not the prototype.
export function LandingNav({ crossLink }: { crossLink: { label: string; href: string } }) {
  return (
    <nav className="sticky top-[14px] z-[60] mx-auto max-w-[1200px] px-6 pt-[14px]">
      <div className="flex items-center justify-between gap-6 rounded-full border border-[rgba(231,221,201,.85)] bg-[rgba(255,253,247,.6)] py-2.5 pl-6 pr-3 shadow-[0_10px_30px_rgba(38,32,25,.07)] backdrop-blur-[16px]">
        <Link href="#top" className="flex items-center gap-2.5">
          <BirdMark width={24} height={22} className="motion-safe:animate-[lp-bob_6s_ease_infinite]" />
          <span className="font-bricolage text-[22px] font-bold tracking-[-0.01em]">Birdsong</span>
        </Link>
        <div className="flex items-center gap-[34px] text-[15px] font-medium">
          <Link href={crossLink.href} className="text-landing-muted transition-colors hover:text-landing-green">
            {crossLink.label}
          </Link>
          <Link href="#how" className="text-landing-muted transition-colors hover:text-landing-green">
            How it works
          </Link>
          <Link href="#features" className="text-landing-muted transition-colors hover:text-landing-green">
            Features
          </Link>
          <Link href="/admin/login" className="text-landing-muted transition-colors hover:text-landing-green">
            Log in
          </Link>
          <Link
            href="/admin/signup"
            className="rounded-full bg-landing-ink px-[22px] py-[11px] font-semibold text-landing-bg"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
