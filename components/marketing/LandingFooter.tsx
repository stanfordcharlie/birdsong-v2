import Link from "next/link";
import { BirdMark } from "./BirdMark";

// Shared footer, identical on both landing pages (design_handoff_landing_pages_full).
export function LandingFooter() {
  return (
    <footer className="border-t border-landing-border">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-6 px-6 py-[30px] md:px-12">
        <Link href="#top" className="flex items-center gap-2.5">
          <BirdMark width={19} height={17} showEye={false} />
          <span className="font-bricolage text-[17px] font-bold">Birdsong</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-landing-muted">
          <Link href="/terms" className="text-landing-muted transition-colors hover:text-landing-green">
            Terms
          </Link>
          <Link href="/privacy" className="text-landing-muted transition-colors hover:text-landing-green">
            Privacy
          </Link>
          <Link href="/admin/login" className="text-landing-muted transition-colors hover:text-landing-green">
            Log in
          </Link>
          <a
            href="mailto:charlie@usebirdsong.com"
            className="text-landing-muted transition-colors hover:text-landing-green"
          >
            charlie@usebirdsong.com
          </a>
          <span className="text-landing-faint">© 2026 Birdsong</span>
        </div>
      </div>
    </footer>
  );
}
