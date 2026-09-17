import { HeroCollage } from "./HeroCollage";
import { PillLink } from "../green/PillLink";

/**
 * Hero: the positioning line, the sub, two CTAs, and the collage.
 *
 * The grid is `auto-fit minmax(340px, 1fr)`, so it holds two columns until
 * the container can no longer give each 340px and then stacks the collage
 * under the copy on its own — no breakpoint decides it. #top is the nav
 * wordmark's target.
 */
export function HomeHero() {
  return (
    <section
      id="top"
      className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(340px,1fr))] items-center gap-[40px] px-[20px] pb-[40px] pt-[56px] sm:px-[32px]"
    >
      <div className="min-w-0">
        <p className="m-0 font-jakarta text-[15px] font-semibold uppercase leading-[1.4] tracking-[0.2em] text-ln-green">
          Interview-led pipeline · Turn conversations into opportunities
        </p>
        <h1 className="m-0 mb-[26px] mt-[22px] text-pretty font-jakarta text-[clamp(40px,5.2vw,72px)] font-extrabold leading-[1.04] tracking-[-0.03em]">
          Turn your audience into pipeline.
        </h1>
        <p className="m-0 mb-[40px] max-w-[600px] text-pretty text-[clamp(18px,1.6vw,23px)] leading-[1.45] text-ln-body">
          Birdsong agents find the right people, talk to them, qualify their intent, and route the
          best opportunities straight to your sales team.
        </p>
        <div className="flex flex-wrap gap-[14px]">
          <PillLink href="/admin/signup" variant="filled" className="px-[40px] py-[18px] text-[20px]">
            Get started
          </PillLink>
          <PillLink href="#how" variant="outline" className="px-[38px] py-[16px] text-[20px]">
            See how it works
          </PillLink>
        </div>
      </div>

      <HeroCollage />
    </section>
  );
}
