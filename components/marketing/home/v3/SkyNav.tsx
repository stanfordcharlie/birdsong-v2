import { BirdsongMark } from "@/components/brand/BirdsongMark";

/**
 * Nav: a fixed translucent pill, in one state, over everything.
 *
 * v5 removed the scroll behaviour entirely. It used to be transparent with
 * cream text over the hero and cross-fade to a solid cream bar once the hero
 * was mostly past, which is why this file was a client component with a
 * scroll listener; it is now static markup and renders on the server.
 *
 * The one state works on both grounds because it is frosted rather than
 * tinted: a 34% white wash over `blur(18px) saturate(1.4)` takes its colour
 * from whatever is behind it, so the same bar reads as pale blue on the
 * hero's sky, near-white on the cream of the steps section, and dusk blue
 * again over the closing CTA. Ink text has contrast on all three, which the
 * old cream text did not — that is what the cross-fade existed to solve.
 *
 * The saturate is doing real work next to the blur: blurring a gradient
 * averages it toward grey, and pushing saturation back up 1.4x is what keeps
 * the bar reading as *sky seen through glass* rather than as a grey panel.
 *
 * `fixed`, not `sticky`: the hero is a full-viewport sky the nav floats over,
 * and a sticky bar would take layout at the top and push the sky down by its
 * own height. The header stays pointer-events-none so the hero's sky is as
 * tall as it looks, with the bar itself opting back in.
 *
 * Below `bsl-wide` the three section links are dropped and everything else
 * steps down a size. At full sizing the row's min-content is about 406px,
 * past a phone's width, and because SkyShell clips overflow-x rather than
 * scrolling it "Book a demo" would not just be cut off but unreachable. The
 * links are the safe thing to lose: all three are in-page anchors that the
 * hero's "See how it works" and the footer still reach. Both controls stay,
 * and both are whitespace-nowrap — dropping "Log in" would have been the easy
 * way to make the row fit, but it is the only way back in for someone who
 * already has an account.
 */
export function SkyNav({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-[16px] py-[16px] bsl-wide:px-[24px]">
      <nav className="bsl-drop pointer-events-auto mx-auto flex max-w-[1440px] items-center gap-[12px] rounded-full border border-white/55 bg-white/[0.34] py-[10px] pl-[14px] pr-[10px] text-bsl-ink shadow-bsl-nav backdrop-blur-[18px] backdrop-saturate-[1.4] bsl-wide:gap-[32px] bsl-wide:pl-[24px]">
        <a
          href="#top"
          className="flex shrink-0 items-center gap-[8px] text-current bsl-wide:gap-[10px]"
        >
          <BirdsongMark size={34} className="h-auto w-[26px] bsl-wide:w-[34px]" />
          {/* The wordmark is the page's one piece of Bricolage Grotesque —
              every other heading is Instrument Serif. Tight at -0.03em, which
              at 23px is what keeps it reading as a mark rather than a word. */}
          <span className="font-bsl-display text-[19px] font-bold tracking-[-0.03em] bsl-wide:text-[23px]">
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
        <div className="ml-auto flex items-center gap-[14px] bsl-wide:ml-0 bsl-wide:gap-[24px]">
          <a
            href="/admin/login"
            className="whitespace-nowrap text-[14px] text-current hover:opacity-70 bsl-wide:text-[16px]"
          >
            Log in
          </a>
          {/* Ink-on-white, not the forest green the rest of the page uses for
              primary actions. Against a bar that borrows its colour from the
              sky behind it, forest is the one fill that would shift with the
              scroll; near-black is the only thing that stays put. */}
          <a
            href={bookDemoUrl}
            className="inline-block whitespace-nowrap rounded-full bg-bsl-ink px-[14px] py-[9px] text-[14px] font-medium text-white transition-opacity hover:opacity-85 bsl-wide:px-[16px] bsl-wide:text-[15px]"
          >
            Book a demo
          </a>
        </div>
      </nav>
    </header>
  );
}
