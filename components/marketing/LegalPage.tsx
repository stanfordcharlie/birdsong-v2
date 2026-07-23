import Link from "next/link";
import { LandingPageShell } from "./LandingPageShell";
import { LandingFooter } from "./LandingFooter";
import { BirdMark } from "./BirdMark";

// Shared chrome for the static legal pages (/terms, /privacy). Reuses the
// marketing ground, fonts, and footer via LandingPageShell, but deliberately
// not LandingNav: the landing nav's links are in-page anchors (#how,
// #features) that don't exist here. A plain wordmark back to home is all a
// legal page needs. The title renders in Spectral (serif) per the page-title
// treatment; body prose is styled by the .legal-prose rules in globals.css.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <LandingPageShell tone="eggshell">
      <header className="mx-auto max-w-[720px] px-6 pt-10 md:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <BirdMark width={22} height={20} />
          <span className="font-bricolage text-[19px] font-bold text-landing-ink">Birdsong</span>
        </Link>
      </header>
      <main className="mx-auto max-w-[720px] px-6 pb-20 pt-10 md:px-8">
        <h1 className="font-spectral text-balance text-[40px] font-medium leading-[1.1] tracking-[-0.01em] text-landing-ink">
          {title}
        </h1>
        <p className="mt-3 text-sm text-landing-faint">Last updated {updated}</p>
        <div className="legal-prose mt-10">{children}</div>
      </main>
      <LandingFooter />
    </LandingPageShell>
  );
}
