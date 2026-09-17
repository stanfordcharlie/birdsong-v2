import Image from "next/image";

/**
 * Nav: a sticky frosted-glass pill rather than a full-width bar.
 *
 * `sticky`, not `fixed`, so the pill still occupies its own 16px inset in
 * flow and the hero starts below it — nothing has to be pushed down by hand.
 * The translucent fill only reads as glass while something is scrolling under
 * it, which is the whole reason the hero's rules-grid now fades in beneath it
 * (see .hp-grid-ink) instead of being sliced by the pill's edge.
 *
 * Log in sits next to the CTA rather than out on its own, and has lost its
 * outline: two bordered controls inside an already-bordered pill was one
 * frame too many.
 *
 * Below 900px the two section anchors and the divider are dropped, and
 * everything else steps down a size. At full desktop sizing the row's
 * min-content is ~480px, so on a phone it used to run straight off the right
 * edge — and because HomeShell clips overflow-x rather than scrolling it, the
 * "Book a demo" CTA was not just cut off but unreachable. Product and Pricing
 * are the safe things to drop: both are in-page anchors that the hero's "Learn
 * more" and the footer still reach.
 */
const navLink =
  "rounded-full px-[8px] py-[9px] text-[15px] text-hp-body transition-colors hover:bg-hp-ink/[0.06] hover:text-hp-ink hp-wide:px-[14px] hp-wide:py-[7px] hp-wide:text-[17px]";

export function HomeNav({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <div className="sticky top-0 z-50 px-[12px] pt-[12px] hp-wide:px-[16px] hp-wide:pt-[16px]">
      <div className="mx-auto flex max-w-[960px] items-center gap-[2px] rounded-full border border-hp-ink/[0.07] bg-hp-cream/[0.62] py-[10px] pl-[12px] pr-[5px] shadow-[0_6px_24px_rgba(27,31,28,0.08)] backdrop-blur-[18px] hp-wide:gap-[10px] hp-wide:py-[12px] hp-wide:pl-[28px] hp-wide:pr-[12px]">
        <a href="#top" className="flex shrink-0 items-center gap-[6px] hp-wide:gap-[10px]">
          <Image
            src="/birdsong-logo.png"
            alt="Birdsong"
            width={30}
            height={30}
            priority
            className="block h-[26px] w-[26px] rounded-[6px] hp-wide:h-[30px] hp-wide:w-[30px] hp-wide:rounded-[7px]"
          />
          <span className="font-hp-wordmark text-[20px] font-bold leading-none tracking-[-0.015em] hp-wide:text-[23px]">
            Birdsong
          </span>
        </a>

        <span
          aria-hidden
          className="mx-[12px] hidden h-[24px] w-px bg-hp-ink/[0.12] hp-wide:block"
        />

        <nav className="hidden flex-1 flex-wrap items-center gap-[4px] font-normal hp-wide:flex">
          <a href="#product" className={navLink}>
            Product
          </a>
          <a href="#pricing" className={navLink}>
            Pricing
          </a>
        </nav>

        {/* ml-auto does on a phone what the nav's flex-1 does on desktop: pin
            this pair to the right edge once the links between are gone. */}
        <a href="/admin/login" className={`${navLink} ml-auto shrink-0 hp-wide:ml-0`}>
          Log in
        </a>
        <a
          href={bookDemoUrl}
          className="inline-flex shrink-0 items-center gap-[6px] rounded-full bg-hp-ink px-[12px] py-[10px] text-[15px] text-hp-cream transition-colors hover:bg-hp-green hp-wide:px-[22px] hp-wide:py-[12px] hp-wide:text-[17px]"
        >
          <span>Book a demo</span>
          <span aria-hidden className="hidden hp-wide:inline">
            →
          </span>
        </a>
      </div>
    </div>
  );
}
