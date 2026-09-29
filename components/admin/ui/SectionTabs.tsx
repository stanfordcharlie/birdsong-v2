"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { border, text } from "./tokens";

export type SectionTab<T extends string> = {
  value: T;
  label: string;
  count?: number;
  /** Makes the tab a link. Use when each section has its own URL. */
  href?: string;
};

/**
 * The sections of one page: Responses, Prospects, Report.
 *
 * Text tabs on a hairline baseline; the active one carries a 2px accent
 * underline drawn inside its own box, so the baseline never shifts. For a
 * filter over one list (All, Unworked, Mine) use FilterTabs instead.
 *
 * Pass `href` on the tabs for sections that are routes, or `onChange` for
 * sections that swap in place. `trailing` sits at the right end of the
 * baseline: a search field, a toggle.
 */
export function SectionTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  trailing,
  className,
}: {
  tabs: SectionTab<T>[];
  value: T;
  onChange?: (value: T) => void;
  /** Names the tab list for screen readers, e.g. "Study sections". */
  label: string;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b", border.base, className)}>
      <div role="tablist" aria-label={label} className="flex min-w-0 items-center gap-6 overflow-x-auto">
        {tabs.map((tab) => {
          const active = value === tab.value;
          const classes = cn(
            "ds-body-strong focus-ring flex h-[42px] shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors",
            active
              ? cn(text.ink, "[box-shadow:inset_0_-2px_0_hsl(var(--ds-accent))]")
              : cn(text.muted2, "hover:text-[color:hsl(var(--ds-ink))]")
          );
          const body = (
            <>
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn("ds-mono-count", active ? text.muted2 : text.muted3)}>{tab.count}</span>
              )}
            </>
          );
          return tab.href ? (
            <Link key={tab.value} href={tab.href} role="tab" aria-selected={active} className={classes}>
              {body}
            </Link>
          ) : (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange?.(tab.value)}
              className={classes}
            >
              {body}
            </button>
          );
        })}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2 pb-2">{trailing}</div>}
    </div>
  );
}
