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
 */
const navLink =
  "rounded-full px-[14px] py-[7px] text-[17px] text-hp-body transition-colors hover:bg-hp-ink/[0.06] hover:text-hp-ink";

export function HomeNav({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <div className="sticky top-0 z-50 px-[16px] pt-[16px]">
      <div className="mx-auto flex max-w-[960px] items-center gap-[10px] rounded-full border border-hp-ink/[0.07] bg-hp-cream/[0.62] py-[12px] pl-[28px] pr-[12px] shadow-[0_6px_24px_rgba(27,31,28,0.08)] backdrop-blur-[18px]">
        <a href="#top" className="flex items-center gap-[10px]">
          <Image
            src="/birdsong-logo.png"
            alt="Birdsong"
            width={30}
            height={30}
            priority
            className="block rounded-[7px]"
          />
          <span className="font-hp-wordmark text-[23px] font-bold leading-none tracking-[-0.015em]">
            Birdsong
          </span>
        </a>

        <span aria-hidden className="mx-[12px] h-[24px] w-px bg-hp-ink/[0.12]" />

        <nav className="flex flex-1 flex-wrap items-center gap-[4px] font-normal">
          <a href="#product" className={navLink}>
            Product
          </a>
          <a href="#pricing" className={navLink}>
            Pricing
          </a>
        </nav>

        <a href="/admin/login" className={navLink}>
          Log in
        </a>
        <a
          href={bookDemoUrl}
          className="inline-flex items-center gap-[6px] rounded-full bg-hp-ink px-[22px] py-[12px] text-[17px] text-hp-cream transition-colors hover:bg-hp-green"
        >
          Book a demo <span>→</span>
        </a>
      </div>
    </div>
  );
}
