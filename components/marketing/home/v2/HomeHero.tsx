import Image from "next/image";
import { hpPrimary, hpSecondary } from "./buttons";

/**
 * Hero: a three-column grid on a 188px rules-grid, copy centred in the middle
 * column with three tilted notes in each side column.
 *
 * The side columns exist so the notes can be absolutely positioned without
 * ever landing on the copy — the handoff is explicit that they must not
 * overlap it. Under 900px there is no room for them and they are dropped
 * entirely rather than restacked.
 */
const note =
  "absolute aspect-square w-[clamp(96px,11vw,170px)] rounded-[8px] font-hp-hand text-hp-ink shadow-hp-note";

export function HomeHero({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <section
      id="top"
      className="relative mx-auto grid max-w-[1200px] scroll-mt-[96px] grid-cols-1 items-center gap-[16px] px-[24px] pb-[160px] pt-[96px] hp-wide:grid-cols-[minmax(150px,1fr)_minmax(0,3.6fr)_minmax(150px,1fr)]"
    >
      {/* The rules-grid rides its own layer so its top-edge mask does not also
          mask the copy and the notes. Masking the section itself would fade
          out the H1 along with the lines. */}
      <div aria-hidden className="hp-grid-ink pointer-events-none absolute inset-0" />

      <div className="relative hidden h-full min-h-[420px] hp-wide:block">
        <div className="absolute left-0 top-0 rotate-[-8deg] whitespace-nowrap font-hp-hand text-[clamp(22px,2.6vw,36px)] font-semibold leading-none">
          ✓ Qualified
        </div>
        <div className={`${note} left-0 top-[44%] flex rotate-[-7deg] flex-col items-center justify-center gap-[2px] bg-hp-note-tan`}>
          <span className="text-[clamp(14px,1.4vw,20px)] font-semibold tracking-[0.06em]">ACCEPTED</span>
          <span className="text-[clamp(34px,4vw,56px)] font-semibold leading-none underline decoration-2 underline-offset-[6px]">
            61
          </span>
        </div>
        <div className={`${note} left-[clamp(40px,5vw,90px)] top-[72%] flex rotate-[5deg] flex-col justify-between px-[12%] pb-[10%] pt-[12%] bg-hp-note-yellow`}>
          <span className="text-[clamp(12px,1.2vw,16px)] font-semibold leading-none tracking-[0.06em]">
            DEMOS BOOKED
          </span>
          <div className="flex flex-1 items-end gap-[6%] border-b-2 border-hp-ink pt-[8%]">
            <span className="h-[18%] flex-1 rounded-t-[2px] bg-hp-ink opacity-[0.35]" />
            <span className="h-[30%] flex-1 rounded-t-[2px] bg-hp-ink opacity-[0.5]" />
            <span className="h-[48%] flex-1 rounded-t-[2px] bg-hp-ink opacity-[0.7]" />
            <span className="h-[72%] flex-1 rounded-t-[2px] bg-hp-ink" />
            <span className="h-full flex-1 rounded-t-[2px] bg-hp-green" />
          </div>
          <div className="flex justify-between pt-[6px] text-[clamp(10px,1vw,14px)] font-semibold leading-none">
            <span>Jan</span>
            <span>May</span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-[28px] px-[8px] text-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-[8px] text-[17px] text-hp-body">
          Interview-led pipeline for{" "}
          <span className="inline-flex items-center gap-[6px] font-medium text-hp-green">
            <Image src="/birdsong-logo.png" alt="" width={18} height={18} className="rounded-[4px]" />
            B2B revenue teams
          </span>
        </div>
        <h1 className="m-0 text-balance font-hp-serif text-[clamp(48px,6.6vw,96px)] font-normal leading-none tracking-[-0.025em]">
          Turn Your Audience Into Pipeline.
        </h1>
        <p className="m-0 max-w-[640px] text-balance text-[clamp(18px,1.7vw,23px)] leading-[1.4] text-hp-body">
          Birdsong Agents Find The Right People, Talk To Them, And Route Qualified Opportunities
          Straight To Your Sales Team.
        </p>
        <div className="flex flex-wrap justify-center gap-[12px] pt-[8px]">
          <a href="#product" className={`${hpSecondary} bg-hp-cream px-[20px] py-[12px] text-[17px]`}>
            Learn more
          </a>
          <a href={bookDemoUrl} className={`${hpPrimary} px-[20px] py-[12px] text-[17px]`}>
            Book a demo <span>→</span>
          </a>
        </div>
      </div>

      <div className="relative hidden h-full min-h-[420px] hp-wide:block">
        <div className="absolute right-0 top-0 rotate-[6deg] text-center font-hp-hand text-[clamp(22px,2.6vw,36px)] font-semibold leading-none">
          Demo
          <br />
          booked ✓
        </div>
        <div className={`${note} right-0 top-[40%] flex rotate-[7deg] items-center justify-center bg-hp-green shadow-hp-note-deep`}>
          <div className="flex aspect-square w-[64%] items-center justify-center rounded-full border-[3px] border-dashed border-hp-cream font-hp-hand text-[clamp(20px,2.2vw,30px)] font-semibold text-hp-cream">
            9 / 10
          </div>
        </div>
        <div className={`${note} right-[clamp(40px,5vw,90px)] top-[70%] flex rotate-[-5deg] flex-col items-center justify-center bg-hp-green-pale leading-none`}>
          <span className="text-[clamp(28px,3.4vw,46px)] font-semibold">↑ 3×</span>
          <span className="text-center text-[clamp(12px,1.2vw,17px)] font-semibold leading-[1.15] tracking-[0.08em]">
            MORE INBOUND
            <br />
            LEADS
          </span>
        </div>
      </div>
    </section>
  );
}
