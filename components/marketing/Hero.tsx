import Link from "next/link";
import { InterviewDemoCard, type InterviewDemoContent } from "./InterviewDemoCard";

// Ambient background layer: two blurred drifting color blobs plus three
// drifting music-note glyphs, identical on both landing pages
// (design_handoff_landing_pages_full). Purely decorative — motion-safe:
// only, each element's plain position/opacity is already a fine static
// resting frame.
function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-[70px] left-[8%] h-[320px] w-[320px] rounded-full bg-landing-green-bg opacity-55 blur-[70px] motion-safe:animate-[lp-drift_14s_ease-in-out_infinite]" />
      <div className="absolute -top-[50px] right-[6%] h-[300px] w-[300px] rounded-full bg-landing-blue-bg opacity-60 blur-[70px] motion-safe:animate-[lp-drift_17s_ease-in-out_2s_infinite_reverse]" />
      <span className="absolute left-[16%] top-[120px] text-[22px] text-landing-green opacity-50 motion-safe:animate-[lp-drift_9s_ease-in-out_infinite]">
        &#9834;
      </span>
      <span className="absolute right-[20%] top-[82px] text-lg text-landing-blue opacity-50 motion-safe:animate-[lp-drift_11s_ease-in-out_1.2s_infinite]">
        &#9835;
      </span>
      <span className="absolute right-[11%] top-[236px] text-base text-landing-faint opacity-55 motion-safe:animate-[lp-drift_13s_ease-in-out_0.6s_infinite]">
        &#9834;
      </span>
    </div>
  );
}

export function Hero({
  h1Pre,
  h1Colored,
  h1FontSizePx,
  subhead,
  demoContent,
}: {
  h1Pre: string;
  h1Colored: string;
  h1FontSizePx: 62 | 58;
  subhead: string;
  demoContent: InterviewDemoContent;
}) {
  return (
    <section
      id="top"
      className="relative px-6 py-20 md:px-12"
      style={{
        background:
          "radial-gradient(880px 460px at 28% -10%, rgba(58,96,70,.1), transparent 60%), radial-gradient(880px 460px at 72% -12%, rgba(84,116,158,.1), transparent 60%)",
      }}
    >
      <AmbientBackground />
      <div className="relative mx-auto flex max-w-[1360px] flex-col items-center">
        <h1
          data-reveal="1"
          className="text-balance relative m-0 max-w-[980px] text-center font-bricolage font-bold leading-[1.05] tracking-[-0.025em]"
          style={{ fontSize: h1FontSizePx }}
        >
          {h1Pre}{" "}
          <span className="relative inline-block text-landing-blue">
            {h1Colored}
            <svg
              width="100%"
              height="16"
              viewBox="0 0 240 16"
              preserveAspectRatio="none"
              fill="none"
              aria-hidden="true"
              className="absolute -bottom-3 left-0"
            >
              <path
                d="M5 10 C 44 3 82 14 120 8 C 158 2 196 13 235 6"
                stroke="var(--lp-blue-mid)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p
          data-reveal="1"
          style={{ transitionDelay: "0.1s" }}
          className="text-pretty mt-[18px] max-w-[620px] text-center text-lg leading-[1.55] text-landing-muted"
        >
          {subhead}
        </p>
        <div data-reveal="1" style={{ transitionDelay: "0.2s" }} className="mt-6 flex gap-3.5">
          <Link
            href="/admin/signup"
            className="rounded-full bg-landing-ink px-[26px] py-[13px] text-[15.5px] font-semibold text-landing-bg"
          >
            Get started
          </Link>
          <Link
            href="#how"
            className="rounded-full border-[1.5px] border-landing-ink px-[26px] py-[13px] text-[15.5px] font-semibold"
          >
            See how it works
          </Link>
        </div>

        <InterviewDemoCard content={demoContent} />
      </div>
    </section>
  );
}
