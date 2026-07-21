import { Starburst } from "./Starburst";

// Step 3 ("Route" / "Deliver") graphic (design_handoff_landing_pages_full):
// a lead/account card that cycles in on a loop, with a pop-in score badge
// and a "booked!"/"growing!" starburst at the corner.
export function RouteGraphic({
  cardTitle,
  badgeLabel,
  subline,
  footerLine,
  stickerLabel,
}: {
  cardTitle: string;
  badgeLabel: string;
  subline: string;
  footerLine: string;
  stickerLabel: string;
}) {
  return (
    <div className="relative flex h-[190px] items-center justify-center">
      <div className="w-full max-w-[310px] rounded-2xl border border-landing-border bg-landing-surface px-[22px] py-5 shadow-[0_10px_28px_rgba(38,32,25,.08)] motion-safe:animate-[lp-card-in_9s_ease_infinite]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[15.5px] font-semibold">{cardTitle}</div>
          <span className="rounded-full bg-landing-green-bg px-3 py-1 text-[12.5px] font-semibold text-landing-green motion-safe:animate-[lp-badge-pop_9s_cubic-bezier(.34,1.56,.64,1)_infinite]">
            {badgeLabel}
          </span>
        </div>
        <div className="mt-2 text-[13.5px] text-landing-muted">{subline}</div>
        <div className="mt-3 flex items-center gap-1.5 border-t border-landing-border pt-3 text-[12.5px] text-landing-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-landing-green motion-safe:animate-[lp-dot-blink_2.4s_ease_infinite]" />
          {footerLine}
        </div>
      </div>
      <Starburst
        label={stickerLabel}
        size={82}
        rotationDeg={7}
        fillClassName="fill-landing-blue-bg"
        labelClassName="text-[13.5px]"
        className="absolute -right-3.5 -top-2"
      />
    </div>
  );
}
