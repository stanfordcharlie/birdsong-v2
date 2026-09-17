import { cn } from "@/lib/utils";

/**
 * The live dot.
 *
 * One dot for the whole surface, in one colour. `pulse` is opt-in and already
 * gated on prefers-reduced-motion by the bs-dot keyframes in globals.css.
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
        "block h-2 w-2 shrink-0 rounded-pill",
        live ? "bg-brand-live" : "bg-faint",
        live && pulse && "bs-dot",
        className
      )}
    />
  );
}
