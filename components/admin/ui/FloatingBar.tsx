import * as React from "react";
import { cn } from "@/lib/utils";
import { bg, radius, shadow, text } from "./tokens";

/**
 * The floating action bar: bulk actions over a table, the actions on a lead.
 *
 * Pinned to the bottom centre of its nearest positioned ancestor, on the ink
 * ground. This is the one pill in admin. Its children are FloatingBarButtons,
 * exactly one of them `primary`; `label` is the short lead-in at the left
 * ("2 selected").
 */
export function FloatingBar({
  label,
  children,
  className,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  label?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-[28px] z-30 flex justify-center",
        className
      )}
      {...props}
    >
      <div
        role="toolbar"
        className={cn(
          "pointer-events-auto flex items-center gap-1 p-[6px]",
          label !== undefined && label !== null && "pl-[18px]",
          radius.pill,
          bg.ink,
          shadow.float
        )}
      >
        {label !== undefined && label !== null && (
          <span className={cn("ds-control mr-[10px] whitespace-nowrap", text.onInk)}>{label}</span>
        )}
        {children}
      </div>
    </div>
  );
}

export const FloatingBarButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    /** The one action the bar exists for: white ground, ink text. */
    primary?: boolean;
  }
>(({ className, primary = false, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "inline-flex h-[38px] shrink-0 items-center justify-center gap-2 whitespace-nowrap text-[13px] leading-none transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ds-accent-bright))]",
      "disabled:pointer-events-none disabled:opacity-50",
      radius.pill,
      primary
        ? cn("px-[16px] font-extrabold", bg.base, text.ink)
        : cn("bg-transparent px-[14px] font-semibold hover:bg-[color:hsl(var(--ds-ink-2))]", text.onInk),
      className
    )}
    {...props}
  />
));
FloatingBarButton.displayName = "FloatingBarButton";
