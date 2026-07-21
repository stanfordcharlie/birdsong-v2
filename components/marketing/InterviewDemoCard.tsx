import { Starburst } from "./Starburst";

export type InterviewDemoContent = {
  headerLabel: string;
  question: { pre: string; bold: string; post: string };
  answer: string;
  chipA: string;
  chipB: string;
};

// The hero's floating "live interview" artifact (design_handoff_landing_pages_full)
// — mac-dots header, a 12s looping question/answer/chips exchange on the
// page background, and a "chirp!" starburst at the card's left edge. The
// whole card floats gently; note glyphs rise and fade as messages land.
// Every loop is motion-safe: (see globals.css's block comment) with a
// fully-visible static resting frame as the plain className base, so
// reduced-motion users see one complete, representative exchange instead
// of nothing.
export function InterviewDemoCard({ content }: { content: InterviewDemoContent }) {
  return (
    <div
      className="relative mt-[38px] w-full max-w-[940px]"
      data-reveal="1"
      style={{ transitionDelay: "0.3s" }}
    >
      <div className="motion-safe:animate-[lp-floaty_7.5s_ease-in-out_infinite]">
        <Starburst
          label="chirp!"
          size={96}
          rotationDeg={-8}
          fillClassName="fill-landing-green-bg"
          className="absolute -left-[46px] bottom-[52px] z-[2]"
        />
        <div className="overflow-hidden rounded-[18px] border border-landing-border bg-landing-surface shadow-[0_24px_60px_rgba(38,32,25,.12)]">
          <div className="flex items-center gap-2 border-b border-landing-border px-5 py-3.5">
            <span className="h-2.5 w-2.5 rounded-full bg-landing-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-landing-border" />
            <span className="h-2.5 w-2.5 rounded-full bg-landing-border" />
            <span className="ml-2.5 text-[13.5px] font-medium text-landing-muted">
              Birdsong &middot; {content.headerLabel}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-landing-green">
              <span className="h-[7px] w-[7px] rounded-full bg-landing-green motion-safe:animate-[lp-dot-blink_2.2s_ease_infinite]" />
              Recording notes
            </span>
          </div>
          <div className="relative flex min-h-[260px] flex-col gap-3.5 bg-landing-bg px-11 pb-[42px] pt-9">
            <span className="absolute right-[120px] top-4 text-[17px] text-landing-green opacity-0 motion-safe:animate-[lp-hero-note-1_12s_ease_infinite]">
              &#9834;
            </span>
            <span className="absolute right-16 top-[60px] text-[15px] text-landing-faint opacity-0 motion-safe:animate-[lp-hero-note-2_12s_ease_infinite]">
              &#9835;
            </span>
            <div className="max-w-[78%] self-start rounded-tl-2xl rounded-tr-2xl rounded-bl-[5px] rounded-br-2xl border border-landing-border bg-landing-surface px-5 py-3.5 text-base leading-[1.55] shadow-[0_2px_8px_rgba(38,32,25,.05)] motion-safe:animate-[lp-hero-q_12s_ease_infinite]">
              {content.question.pre} <strong>{content.question.bold}</strong> {content.question.post}
            </div>
            <div className="max-w-[72%] self-end rounded-tl-2xl rounded-tr-2xl rounded-br-[5px] rounded-bl-2xl bg-landing-green px-5 py-3.5 text-base leading-[1.55] text-[#f2f6ef] motion-safe:animate-[lp-hero-a_12s_ease_infinite]">
              {content.answer}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-landing-blue-mid bg-landing-blue-bg px-[18px] py-2.5 text-[13.5px] font-semibold text-landing-blue motion-safe:animate-[lp-hero-chip-1_12s_ease_infinite]">
                {content.chipA}
              </span>
              <span className="rounded-full border border-landing-green bg-landing-green-bg px-[18px] py-2.5 text-[13.5px] font-semibold text-landing-green motion-safe:animate-[lp-hero-chip-2_12s_ease_infinite]">
                {content.chipB}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
