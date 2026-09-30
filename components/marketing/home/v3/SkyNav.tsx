"use client";

import { useEffect, useState } from "react";
import { BirdMark } from "./BirdMark";
import { bslForest } from "./buttons";

/**
 * Nav: a fixed pill that starts invisible over the hero's sky and resolves
 * into a solid cream bar once the hero is mostly past.
 *
 * `fixed`, not `sticky`: the hero is a full-viewport sky the nav has to float
 * *over*, and a sticky bar would occupy layout at the top and push the sky
 * down by its own height. The header is pointer-events-none so the hero's
 * sky stays as tall as it looks, with the bar itself opting back in.
 *
 * The flip is at 70% of viewport height, not at a fixed pixel offset — the
 * hero is `max(100vh, 760px)`, so any constant would fire in the wrong place
 * on some window. Transparent-to-solid is animated by transitioning
 * background and border-color; the two text colours cross-fade with them, and
 * the bird mark comes along for free because it fills with currentColor.
 *
 * The padding shrink (20px -> 12px) is on the wrapper rather than the bar, so
 * the bar's own 14px/18px/28px padding stays put and only its distance from
 * the top edge changes.
 *
 * Below 900px the three section links are dropped and everything else steps
 * down a size. At full sizing the row's min-content is well past a phone's
 * width, and because SkyShell clips overflow-x rather than scrolling it,
 * "Book a demo" would not just be cut off but unreachable. The links are the
 * safe thing to lose: all three are in-page anchors the hero's "See how it
 * works" and the footer still reach.
 *
 * Both buttons stay, and both are whitespace-nowrap. Dropping "Log in" would
 * have been the easy way to make the row fit, but it is the only way back in
 * for someone who already has an account. Without the nowrap they do fit —
 * by breaking "Book a demo" across three lines and standing the bar up 116px
 * tall.
 */
export function SkyNav({ bookDemoUrl }: { bookDemoUrl: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on mount: a reload part-way down the page would otherwise
    // paint a transparent bar over cream until the first scroll event.
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`pointer-events-none fixed inset-x-0 top-0 z-50 px-[16px] transition-[padding] duration-300 ease-out bsl-wide:px-[24px] ${
        scrolled ? "py-[12px]" : "py-[20px]"
      }`}
    >
      <nav
        className={`pointer-events-auto mx-auto flex max-w-[1440px] items-center gap-[12px] rounded-[18px] border py-[10px] pl-[14px] pr-[8px] backdrop-blur-[14px] transition-[background-color,border-color,color] duration-300 ease-out bsl-wide:gap-[32px] bsl-wide:py-[14px] bsl-wide:pl-[28px] bsl-wide:pr-[18px] ${
          scrolled
            ? "border-bsl-line bg-bsl-nav/[0.96] text-bsl-ink"
            : "border-transparent bg-transparent text-bsl-cream"
        }`}
      >
        <a href="#top" className="flex shrink-0 items-center gap-[8px] text-current bsl-wide:gap-[10px]">
          <BirdMark width={34} className="h-auto w-[26px] bsl-wide:w-[34px]" />
          <span className="font-bsl-serif text-[22px] leading-none tracking-[-0.01em] bsl-wide:text-[30px]">
            Birdsong
          </span>
        </a>

        <div className="hidden flex-1 flex-wrap gap-[28px] text-[16px] bsl-wide:flex">
          <a href="#how" className="text-current hover:opacity-70">
            Product
          </a>
          <a href="#how" className="text-current hover:opacity-70">
            How it works
          </a>
          <a href="#pricing" className="text-current hover:opacity-70">
            Pricing
          </a>
        </div>

        {/* ml-auto does on a phone what the links' flex-1 does on desktop:
            pin the two controls to the right edge once the links are gone. */}
        <div className="ml-auto flex items-center gap-[8px] bsl-wide:ml-0 bsl-wide:gap-[10px]">
          <a
            href={bookDemoUrl}
            className={`${bslForest} whitespace-nowrap px-[14px] py-[10px] text-[14px] bsl-wide:px-[22px] bsl-wide:py-[13px] bsl-wide:text-[16px]`}
          >
            Book a demo
          </a>
          <a
            href="/admin/login"
            className="inline-block whitespace-nowrap rounded-[12px] bg-bsl-cream-alt px-[14px] py-[10px] text-[14px] font-medium text-bsl-ink transition-colors hover:bg-bsl-cream bsl-wide:px-[22px] bsl-wide:py-[13px] bsl-wide:text-[16px]"
          >
            Log in
          </a>
        </div>
      </nav>
    </header>
  );
}
