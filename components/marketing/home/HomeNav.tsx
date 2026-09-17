import Image from "next/image";
import Link from "next/link";
import { PillLink } from "../green/PillLink";

// The in-page section jumps, in the order the design lists them. "For
// customer success" is a real route rather than an anchor, which is why it
// is not in this array.
const SECTION_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "The lead", href: "#story" },
  { label: "Research", href: "#research" },
];

/**
 * Sticky top nav for the home landing page.
 *
 * Sticks to the viewport, white on a hairline rule, with no scrolled state —
 * the design gives it one appearance at every scroll position, unlike the
 * condensing capsule on the other marketing pages.
 *
 * The logo, the gutter and both buttons all step down a size below 640px.
 * Without that the row is too wide for a 375px phone and wraps the buttons
 * onto a second line under the wordmark, which reads like a layout bug
 * rather than a compact nav.
 *
 * Below 1100px (the `ln-nav` screen) the section links are dropped rather than folded into a
 * menu: all three are anchors to sections the visitor is about to scroll
 * through anyway, and the fourth is repeated in the footer, so a hamburger
 * would add a control to open a list of places the page already takes you.
 * The logo and both auth buttons survive at every width, which is what the
 * nav is actually for on a phone.
 */
export function HomeNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-ln-rule bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-[10px] gap-y-[12px] px-[14px] py-[14px] sm:gap-x-[28px] sm:px-[32px] sm:py-[18px]">
        <Link href="#top" className="flex items-center gap-[8px] text-ln-ink no-underline sm:gap-[12px]">
          <Image
            src="/birdsong-logo.png"
            alt=""
            width={46}
            height={46}
            priority
            className="block size-[36px] rounded-[9px] sm:size-[46px] sm:rounded-xl"
          />
          <span className="font-jakarta text-[19px] font-bold tracking-[-0.01em] sm:text-[24px]">
            Birdsong
          </span>
        </Link>

        <div className="ml-[20px] hidden flex-wrap gap-[30px] text-[17px] font-medium ln-nav:flex">
          {SECTION_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ln-ink no-underline transition-colors hover:text-ln-green"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/customer-success"
            className="text-ln-ink no-underline transition-colors hover:text-ln-green"
          >
            For customer success
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-[6px] sm:gap-[12px]">
          <PillLink
            href="/admin/login"
            variant="outline"
            className="px-[12px] py-[10px] text-[15px] sm:px-[28px] sm:py-[12px] sm:text-[17px]"
          >
            Log in
          </PillLink>
          <PillLink
            href="/admin/signup"
            variant="filled"
            className="px-[16px] py-[10px] text-[15px] sm:px-[30px] sm:py-[14px] sm:text-[17px]"
          >
            Get started
          </PillLink>
        </div>
      </div>
    </nav>
  );
}
