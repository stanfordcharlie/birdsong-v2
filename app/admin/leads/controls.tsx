"use client";

import * as React from "react";
import { Button } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

// The two controls the lead queue and the lead page share: the select drawn
// as a secondary button with a chevron, and the toggle chip of the filter
// row. Both are a native element underneath, so the keyboard and the screen
// reader get what they already know.

/**
 * A native select on the secondary button's shape. `default` is the 34px
 * control of a bar or a filter row; `row` is the 32px one inside a table row.
 * `muted` sets the value in muted-3, for a value that means "nothing yet".
 */
export const SelectControl = React.forwardRef<
  HTMLSelectElement,
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    size?: "default" | "row";
    muted?: boolean;
  }
>(({ size = "default", muted = false, className, children, ...props }, ref) => (
  <span className={cn("relative inline-flex min-w-0", className)}>
    <select
      ref={ref}
      className={cn(
        "focus-ring w-full min-w-0 cursor-pointer appearance-none truncate border pr-[28px] font-semibold",
        "hover:bg-[color:hsl(var(--ds-bg-sidebar))] disabled:cursor-not-allowed disabled:opacity-50",
        border.base,
        bg.base,
        size === "row"
          ? cn("h-[32px] pl-[10px] text-[12px]", radius.chip)
          : cn("h-[34px] pl-[12px] text-[13px]", radius.control),
        muted ? text.muted3 : size === "row" ? text.ink : text.ink3
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2", text.muted3)}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  </span>
));
SelectControl.displayName = "SelectControl";

/**
 * A filter that is either on or off. Off is the dashed button, a filter that
 * is not there yet; on takes the tinted accent ground with the accent border
 * and text.
 */
export function ToggleChip({
  active,
  onToggle,
  children,
}: {
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "dashed"}
      aria-pressed={active}
      onClick={onToggle}
      className={
        active
          ? cn(border.accent, bg.accentWeak, text.accent, "hover:bg-[color:hsl(var(--ds-accent-weak))]")
          : "font-semibold"
      }
    >
      {children}
    </Button>
  );
}
