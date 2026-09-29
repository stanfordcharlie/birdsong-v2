import Link from "next/link";
import { bg, border, dot, radius, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

// The Home page's server-rendered card: Needs you. The worth-a-call card
// (HomeWorthACall.tsx) and Live now (HomeLive.tsx) are client components,
// because one counts up and the other reads Realtime Presence.

export type NeedsYouItem = {
  id: string;
  tone: "new" | "danger" | "muted";
  label: React.ReactNode;
  action: string;
  href: string;
};

const DOT: Record<NeedsYouItem["tone"], string> = {
  new: dot.statusNew,
  danger: dot.danger,
  muted: dot.muted3,
};

export function NeedsYouCard({ items, enterDelayMs }: { items: NeedsYouItem[]; enterDelayMs: number }) {
  return (
    <section
      className={cn("ds-enter overflow-hidden border", radius.hero, border.base, bg.base)}
      style={{ "--ds-enter-delay": `${enterDelayMs}ms` } as React.CSSProperties}
    >
      <h2 className={cn("ds-control flex h-[48px] items-center px-5", bg.sidebar)}>Needs you</h2>
      {items.length === 0 ? (
        <p className={cn("border-t px-5 py-4 text-[14px]", border.base, text.muted2)}>
          Nothing needs you right now.
        </p>
      ) : (
        items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "focus-ring flex items-center gap-3 border-t px-5 py-4 transition-colors hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
              border.base
            )}
          >
            <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", DOT[item.tone])} />
            <span className="min-w-0 flex-1 text-[14px] font-semibold">{item.label}</span>
            <span className={cn("shrink-0 text-[12px] font-bold", text.accent)}>{item.action}</span>
          </Link>
        ))
      )}
    </section>
  );
}
