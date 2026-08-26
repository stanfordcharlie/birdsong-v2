"use client";

import { cn } from "@/lib/utils";

export type FilterTab<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

/**
 * Segmented control with counts.
 *
 * Extracted as-is, not redesigned: Leads and Surveys already rendered this
 * byte-for-byte identically, which made it the one pattern on the surface
 * that did not need a decision, only a home.
 *
 * One segmented track rather than separate bordered chips, because these are
 * a single either/or choice, and the counts make the shape of the account
 * readable without opening each tab.
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
  /** Names the group for screen readers, e.g. "Filter surveys by status". */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center gap-0.5 rounded-control bg-chip p-1", className)}
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
              "focus-ring flex h-7 items-center gap-1.5 rounded-control px-2.5 font-archivo text-[13px] font-medium transition-colors",
              active
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn("text-[12px]", active ? "text-muted-foreground" : "text-faint")}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
