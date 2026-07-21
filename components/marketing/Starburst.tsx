import { cn } from "@/lib/utils";

// 16-point starburst sticker (design_handoff_landing_pages_full) — inline
// SVG polygon, no external asset. Scale-in-with-overshoot on reveal via
// .lp-stk (globals.css), gated behind an ancestor [data-reveal] section
// having revealed (see useScrollReveal's .lp-in). Positioning (absolute +
// offsets + z-index) is the caller's job via `className`, since each
// placement is unique per call site.
export function Starburst({
  label,
  size,
  rotationDeg,
  fillClassName,
  labelClassName,
  className,
}: {
  label: string;
  size: number;
  rotationDeg: number;
  fillClassName: string;
  labelClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("lp-stk", className)}
      style={{ "--lp-rot": `${rotationDeg}deg`, width: size, height: size } as React.CSSProperties}
    >
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute inset-0 drop-shadow-[0_4px_10px_rgba(38,32,25,.14)]"
      >
        <polygon
          points="100,50 83.3,63.8 85.4,85.4 63.8,83.3 50,100 36.2,83.3 14.6,85.4 16.7,63.8 0,50 16.7,36.2 14.6,14.6 36.2,16.7 50,0 63.8,16.7 85.4,14.6 83.3,36.2"
          className={fillClassName}
          stroke="var(--lp-ink)"
          strokeWidth="2.5"
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-sans italic font-bold text-landing-ink",
          labelClassName
        )}
      >
        {label}
      </span>
    </div>
  );
}
