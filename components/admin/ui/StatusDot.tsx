import { cn } from "@/lib/utils";

/**
 * The live dot.
 *
 * One dot for the whole surface. It previously existed as a raw #8fbf7a in
 * five files, as `bg-indigo-light` on the Live board, and as `bg-faint` for
 * the off state, so "live" was three different colours depending on which
 * page you were looking at.
 *
 * `pulse` is opt-in and already gated on prefers-reduced-motion by the
 * bs-dot keyframes in globals.css.
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
        "block h-[7px] w-[7px] shrink-0 rounded-pill",
        live ? "bg-brand-live" : "bg-faint",
        live && pulse && "bs-dot",
        className
      )}
    />
  );
}
