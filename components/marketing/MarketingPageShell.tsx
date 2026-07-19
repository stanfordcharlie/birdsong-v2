import { newsreader } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { MarketingBodyEffects } from "./MarketingBodyEffects";

// tone="eggshell" is the design_handoff_landing_sections ground (#faf8f1,
// flat) applied across the whole of /landing-page; landing-page-2 stays on
// the original beige radial gradient until it gets its own pass.
export function MarketingPageShell({
  children,
  tone = "beige",
}: {
  children: React.ReactNode;
  tone?: "beige" | "eggshell";
}) {
  const eggshell = tone === "eggshell";
  return (
    <div
      className={cn(
        newsreader.variable,
        "min-h-screen overflow-x-hidden text-[#211D16]",
        eggshell
          ? "bg-[#faf8f1]"
          : "bg-[radial-gradient(1200px_600px_at_50%_-10%,#FBF7ED_0%,#F5EFE3_60%)]"
      )}
    >
      <MarketingBodyEffects color={eggshell ? "#faf8f1" : "#F5EFE3"} />
      {children}
    </div>
  );
}
