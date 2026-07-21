import { cn } from "@/lib/utils";

const TINT_CLASSES = {
  green: "bg-landing-green-bg",
  blue: "bg-landing-blue-bg",
  butter: "bg-landing-butter-bg",
} as const;

// One tinted card in the feature trio (design_handoff_landing_pages_full).
export function FeatureCard({
  tint,
  transitionDelay,
  title,
  body,
}: {
  tint: "green" | "blue" | "butter";
  transitionDelay?: string;
  title: string;
  body: string;
}) {
  return (
    <div
      data-reveal="1"
      style={transitionDelay ? { transitionDelay } : undefined}
      className={cn(
        "lp-lift rounded-[18px] border border-landing-border px-[34px] pb-[38px] pt-[34px]",
        TINT_CLASSES[tint]
      )}
    >
      <h3 className="m-0 mb-3 font-bricolage text-[26px] font-bold tracking-[-0.01em]">{title}</h3>
      <p className="text-pretty m-0 text-[15px] leading-[1.6] text-landing-muted">{body}</p>
    </div>
  );
}
