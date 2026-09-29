"use client";

import { cn } from "@/lib/utils";
import { bg, radius, shadow, text } from "./tokens";

export type FilterTab<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

/**
 * Segmented control with counts.
 *
 * One track rather than separate bordered chips, because these are a single
 * either/or choice, and the counts make the shape of the account readable
 * without opening each tab. For the sections of a page (Responses, Prospects,
 * Report) use SectionTabs instead.
 */
export function FilterTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers, e.g. "Filter studies by status". */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center gap-1 p-[3px]", radius.control, bg.track, className)}
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            aria-pressed={active}
            className={cn(
              "ds-control focus-ring flex h-[30px] items-center gap-1.5 whitespace-nowrap px-[12px] transition-colors",
              radius.chip,
              active
                ? cn(bg.base, text.ink, shadow.activeNav)
                : cn(text.muted, "hover:text-[color:hsl(var(--ds-ink))]")
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn("ds-mono-count", active ? text.muted2 : text.muted3)}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
