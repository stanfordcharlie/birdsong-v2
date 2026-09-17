import { MaterialIcon } from "../green/MaterialIcon";
import { SectionHeading } from "./SectionHeading";

// The mini "sticker" cards inside the illustration panels: white, hard ink
// border, 5px offset shadow. Three panels use it, so it is one component
// rather than three copies of the same six utilities.
function MiniCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`absolute border-2 border-ln-ink bg-white px-[14px] py-[12px] shadow-[5px_5px_0_var(--ln-ink)] ${className}`}
    >
      {children}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[190px] overflow-hidden border-[1.5px] border-ln-card-border bg-ln-cream">
      {children}
    </div>
  );
}

function Step({
  number,
  title,
  body,
  panel,
}: {
  number: string;
  title: string;
  body: string;
  panel: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[28px] border-[1.5px] border-ln-card-border p-[28px] sm:p-[40px]">
      <Panel>{panel}</Panel>
      <div>
        <div className="font-jakarta text-[15px] font-extrabold tracking-[0.1em] text-ln-green">
          {number}
        </div>
        <h3 className="m-0 mb-[12px] mt-[8px] font-jakarta text-[26px] font-bold tracking-[-0.01em]">
          {title}
        </h3>
        <p className="m-0 text-[19px] leading-[1.45] text-ln-body">{body}</p>
      </div>
    </div>
  );
}

/**
 * The three-step explainer.
 *
 * Each step's illustration is a fixed-height panel with absolutely
 * positioned decor and one mini card. Unlike the hero collage these are not
 * scaled as a unit — the panels are small enough that the pieces can inset
 * from the panel's own edges instead, so the cards carry a max-width and the
 * offsets tighten below 640px.
 *
 * The grid's min track is 340px rather than the 300px the rest of the page
 * uses, and that 40px is load-bearing. The panel is 190px tall whatever
 * happens, so panel 02's card — which has an 88px circle beside it and two
 * lines of dialogue in it — is the one element on the page that can outgrow
 * its frame. At a 300px min track the grid holds two and three columns down
 * to panel widths near 220px, where that card wraps to six lines and, being
 * bottom-anchored, grows up through the top of the frame. 360px puts the narrowest possible panel at 280px —
 * measured, the card needs 271px — and the extra width only costs one column
 * break slightly earlier.
 */
export function HowItWorks() {
  return (
    <section id="how" className="bg-white px-[20px] py-[64px] sm:px-[32px] sm:py-[96px]">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          eyebrow="How it works"
          heading="From first note to booked demo."
          sub="Three steps, one owner. Birdsong recruits, interviews and scores. Your team only shows up for the demo."
          subClassName="max-w-[720px]"
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-[24px]">
          <Step
            number="01"
            title="Invite the right rooms"
            body="Respondents join a genuine industry conversation. You define the audience; we handle the incentive."
            panel={
              <>
                <div className="absolute -left-[30px] -top-[40px] size-[150px] rounded-full border-[40px] border-ln-sage" />
                <MiniCard className="bottom-[16px] right-[16px] w-[200px] max-w-[calc(100%-32px)] sm:bottom-[24px] sm:right-[24px]">
                  <div className="font-jakarta text-[10px] font-semibold uppercase tracking-[0.14em] text-ln-green">
                    Audience brief
                  </div>
                  <div className="mt-[4px] text-[13px] font-medium leading-[1.35]">
                    Revenue leaders at 50–500 seat B2B software
                  </div>
                  <div className="mt-[10px] flex flex-wrap gap-[6px]">
                    <span className="rounded-full border-[1.5px] border-ln-ink px-[8px] py-[2px] text-[11px] font-semibold">
                      184 invited
                    </span>
                    <span className="rounded-full border-[1.5px] border-ln-ink bg-ln-green-pale px-[8px] py-[2px] text-[11px] font-bold">
                      61 accepted
                    </span>
                  </div>
                </MiniCard>
              </>
            }
          />

          <Step
            number="02"
            title="Listen, never pitch"
            body="Interviews surface how these teams really work, budgets and blockers included. Four follow-ups per answer on average."
            panel={
              <>
                <div className="absolute -right-[20px] -top-[30px] h-[85px] w-[170px] rounded-b-[85px] bg-ln-green" />
                <div className="absolute left-[16px] top-[30px] flex size-[76px] items-center justify-center rounded-full border-[2.5px] border-ln-ink bg-ln-green-pale sm:left-[20px] sm:top-[26px] sm:size-[88px]">
                  <MaterialIcon name="mic" className="text-[38px] sm:text-[44px]" />
                </div>
                <MiniCard className="bottom-[18px] left-[104px] right-[16px] sm:bottom-[22px] sm:left-[120px] sm:right-[20px]">
                  <div className="text-[13px] font-semibold leading-[1.35]">
                    How many hours a month does that cost you?
                  </div>
                  <div className="mt-[6px] text-[13px] leading-[1.35] text-ln-body">
                    Call it forty. My CRO asks about it every week.
                  </div>
                </MiniCard>
              </>
            }
          />

          <Step
            number="03"
            title="Hand over the hot ones"
            body="Hot leads arrive in your queue with the score, the quotes and a generated call opener."
            panel={
              <>
                {/* Four quarter-discs pinwheeling out of the bottom-right corner. */}
                <div className="absolute -bottom-[10px] -right-[10px] grid grid-cols-[60px_60px] gap-[3px]">
                  <div className="size-[60px] rounded-tr-[60px] bg-ln-green" />
                  <div className="size-[60px] rounded-bl-[60px] bg-ln-green" />
                  <div className="size-[60px] rounded-br-[60px] bg-ln-green" />
                  <div className="size-[60px] rounded-tl-[60px] bg-ln-green" />
                </div>
                <MiniCard className="left-[16px] top-[22px] w-[210px] max-w-[calc(100%-32px)] sm:left-[20px]">
                  <div className="flex items-center gap-[10px]">
                    <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full border-2 border-ln-ink bg-ln-sage font-jakarta text-[13px] font-extrabold">
                      SO
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-[1.2]">Sam Okafor</div>
                      <div className="text-[11px] text-ln-muted">Head of Growth · Coretide</div>
                    </div>
                  </div>
                  <div className="mt-[10px] flex items-center justify-between gap-[8px]">
                    <span className="rounded-full border-[1.5px] border-ln-ink bg-ln-green-pale px-[8px] py-[2px] text-[11px] font-bold">
                      Score 9 / 10
                    </span>
                    <span className="text-[11px] font-bold text-ln-green">booked!</span>
                  </div>
                </MiniCard>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
