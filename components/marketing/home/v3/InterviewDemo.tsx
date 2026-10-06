import { BirdsongMark } from "@/components/brand/BirdsongMark";
import {
  INVITE,
  MESSAGES,
  PARTICIPANT,
  PARTICIPANT_INITIALS,
  ROUTED_NOTE,
  ROUTED_STEP,
  SCORING_NOTE,
  SIGNALS,
  SIGNALS_EMPTY,
  TYPING,
} from "./demoContent";

/**
 * The three cards inside the demo well, rendered entirely from `step`.
 *
 * Deliberately stateless: ConversationSection owns the timer and this is a
 * pure function of the step it is handed, so clicking a stage row and the
 * interval ticking are the same code path and cannot drift apart.
 *
 * The bubbles and signal rows animate in via .bsl-in, which runs once on
 * mount. React keys them by index, so a bubble already on screen keeps its
 * DOM node when the next one arrives and does not replay — only the new one
 * moves. That is also why the transcript is rebuilt from a slice rather than
 * appended to: the slice is what makes the keys stable.
 *
 * `auto-fit, minmax(240px, 1fr)` puts the signals and fit-score cards side by
 * side when there is room and stacks them when there is not; the interview
 * card spans the full row either way.
 */

const CARD =
  "rounded-[18px] border border-bsl-line-card bg-bsl-card shadow-bsl-demo-card";
const LABEL = "text-[12px] font-semibold uppercase tracking-[0.08em]";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(n, hi));
}

/** The seven bars beside the "Live interview" label. */
function Waveform() {
  return (
    <div aria-hidden className="flex h-[18px] items-center gap-[3px]">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className="bsl-wave block h-[18px] w-[3px] rounded-[2px] bg-bsl-forest"
          style={
            {
              "--bsl-dur": `${0.8 + (i % 3) * 0.25}s`,
              "--bsl-delay": `${i * 0.1}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Avatar({ ai }: { ai: boolean }) {
  return (
    <div
      aria-hidden
      className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-full ${
        ai ? "bg-bsl-forest text-bsl-cream" : "bg-bsl-sand text-bsl-ink"
      }`}
    >
      {ai ? (
        <BirdsongMark size={17} />
      ) : (
        <span className="text-[12px] font-semibold">{PARTICIPANT_INITIALS}</span>
      )}
    </div>
  );
}

export function InterviewDemo({ step }: { step: number }) {
  const shownMessages = MESSAGES.slice(0, clamp(step, 0, 4));
  const shownSignals = SIGNALS.slice(0, clamp(step - 4, 0, 4));
  const routed = step >= ROUTED_STEP;
  const recruiting = step === 0;
  // Two steps per question, starting part-way in: the demo joins an interview
  // already underway rather than at question one.
  const question = Math.min(6, 2 + Math.ceil(Math.max(step, 1) / 2));
  const score = routed ? 92 : Math.round((clamp(step, 0, 8) / 8) * 78);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[16px]">
      {/* ── Interview ─────────────────────────────────────────────── */}
      <div
        className={`${CARD} col-span-full flex min-h-[430px] flex-col gap-[16px] p-[24px]`}
      >
        <div className="flex items-center justify-between gap-[12px]">
          <div className="flex items-center gap-[8px]">
            <span
              aria-hidden
              className={`h-[8px] w-[8px] rounded-full ${
                recruiting ? "bg-bsl-butter" : "bsl-wave bg-bsl-live"
              }`}
              style={
                { "--bsl-dur": "1.2s", "--bsl-delay": "0s" } as React.CSSProperties
              }
            />
            <span className={`${LABEL} text-bsl-muted`}>
              {recruiting ? "Study · recruiting" : "Live interview"}
            </span>
          </div>
          {recruiting ? (
            <span className="text-[13px] text-bsl-muted">{INVITE.counts}</span>
          ) : (
            <Waveform />
          )}
        </div>

        {!recruiting && (
          <div className="flex flex-col gap-[10px]">
            <div className="flex flex-wrap justify-between gap-[12px] text-[14px] text-bsl-muted">
              <span>{PARTICIPANT}</span>
              <span>Question {question} of 6</span>
            </div>
            <div aria-hidden className="flex gap-[4px]">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <span
                  key={i}
                  className={`h-[3px] flex-1 rounded-[2px] transition-colors [transition-duration:400ms] ${
                    i <= question ? "bg-bsl-forest" : "bg-bsl-line-card"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {recruiting ? (
          <div className="bsl-in flex flex-col gap-[16px] rounded-[14px] bg-bsl-cream px-[26px] py-[28px]">
            <span className={`${LABEL} text-bsl-muted`}>{INVITE.kicker}</span>
            <div className="text-balance font-bsl-serif text-[38px] leading-[1.05] text-bsl-ink">
              {INVITE.title}
            </div>
            <div className="flex flex-wrap gap-[18px] text-[14.5px] text-bsl-body-soft">
              {INVITE.meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
            <span className="mt-[6px] self-start rounded-[10px] bg-bsl-forest px-[20px] py-[12px] text-[15px] font-medium text-bsl-cream">
              {INVITE.cta} <span aria-hidden className="font-bsl-glyph">→</span>
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {shownMessages.map((m, i) => (
              <div
                key={i}
                className={`bsl-in flex items-start gap-[10px] ${
                  m.ai ? "flex-row" : "flex-row-reverse"
                }`}
              >
                <Avatar ai={m.ai} />
                <div
                  className={`max-w-[78%] rounded-[14px] px-[15px] py-[12px] text-[15.5px] leading-[1.45] text-bsl-ink ${
                    m.ai ? "bg-bsl-bubble" : "bg-bsl-sand-soft"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {step > 0 && step < 5 && (
              <div className="flex items-center gap-[8px] pl-[40px] text-[13px] text-bsl-muted">
                <span>{TYPING[step % 2]}</span>
                <span
                  aria-hidden
                  className="bsl-wave inline-block"
                  style={
                    { "--bsl-dur": "1s", "--bsl-delay": "0s" } as React.CSSProperties
                  }
                >
                  …
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Buying signals ────────────────────────────────────────── */}
      <div className={`${CARD} flex flex-col gap-[14px] p-[22px]`}>
        <div className="flex items-center justify-between">
          <span className={`${LABEL} text-bsl-muted`}>Buying signals</span>
          <span className="text-[13px] text-bsl-muted">{shownSignals.length} / 4</span>
        </div>
        <div className="flex flex-col gap-[8px]">
          {shownSignals.map(([key, value]) => (
            <div
              key={key}
              className="bsl-in flex justify-between gap-[10px] rounded-[10px] bg-bsl-cream px-[12px] py-[10px] text-[14.5px]"
            >
              <span className="text-bsl-muted">{key}</span>
              <span className="whitespace-nowrap font-medium text-bsl-ink">{value}</span>
            </div>
          ))}
          {shownSignals.length === 0 && (
            <div className="py-[10px] text-[14px] text-bsl-faint">{SIGNALS_EMPTY}</div>
          )}
        </div>
      </div>

      {/* ── Fit score / routed ────────────────────────────────────── */}
      <div
        className={`${CARD} flex flex-col gap-[14px] p-[22px] transition-colors duration-500 ${
          routed ? "bg-bsl-forest-deep text-bsl-cream" : "bg-bsl-card text-bsl-ink"
        }`}
      >
        <span className={`${LABEL} ${routed ? "text-bsl-sage" : "text-bsl-muted"}`}>
          {routed ? "Routed to sales ✓" : "Fit score"}
        </span>
        <div className="font-bsl-serif text-[68px] leading-none">{score}</div>
        <div
          className={`h-[6px] overflow-hidden rounded-full ${
            routed ? "bg-bsl-cream/25" : "bg-bsl-cream-alt"
          }`}
        >
          <div
            className={`h-full transition-[width] [transition-duration:900ms] [transition-timing-function:cubic-bezier(.2,.7,.2,1)] ${
              routed ? "bg-bsl-sage" : "bg-bsl-forest"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className={`text-[14px] ${routed ? "opacity-100" : "opacity-75"}`}>
          {routed ? ROUTED_NOTE : SCORING_NOTE}
        </div>
      </div>
    </div>
  );
}
