import { cn } from "@/lib/utils";
import { dot } from "./tokens";

/**
 * The live dot.
 *
 * One dot for the whole surface, in the accent. `pulse` is opt-in, for an
 * interview that is running right now, and is already gated on
 * prefers-reduced-motion by the ds-pulse rule in globals.css.
 *
 * Status renders once per row: this dot plus a text label in tables, a badge
 * on detail pages. Never dot and badge and tinted fill for one state.
 */
export function StatusDot({
  live,
  pulse = false,
  className,
}: {
  live: boolean;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-2 w-2 shrink-0 rounded-full",
        live ? dot.accent : dot.muted3,
        live && pulse && "ds-pulse",
        className
      )}
    />
  );
}
