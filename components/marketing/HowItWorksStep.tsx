import { cn } from "@/lib/utils";

const ACCENT_CLASSES = {
  green: "bg-landing-green-bg text-landing-green",
  blue: "bg-landing-blue-bg text-landing-blue",
  butter: "bg-landing-butter-bg text-landing-butter-deep",
} as const;

// One numbered column of "How it works" (design_handoff_landing_pages_full)
// — number chip, a graphic slot (each of the three steps' own component:
// InviteGraphic / ListenGraphic / RouteGraphic), heading, and body copy.
// Shared shell; only the accent color, delay, and content differ per step.
export function HowItWorksStep({
  number,
  accent,
  transitionDelay,
  title,
  body,
  children,
}: {
  number: string;
  accent: "green" | "blue" | "butter";
  transitionDelay: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div data-reveal="1" style={{ transitionDelay }}>
      <div className="mb-[18px] border-t border-landing-border pt-[18px]">
        <span
          className={cn(
            "inline-flex h-[34px] w-[34px] items-center justify-center rounded-full text-[13px] font-bold",
            ACCENT_CLASSES[accent]
          )}
        >
          {number}
        </span>
      </div>
      {children}
      <h3 className="my-5 mb-3 font-bricolage text-[28px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="text-pretty m-0 text-[15.5px] leading-[1.6] text-landing-muted">{body}</p>
    </div>
  );
}
