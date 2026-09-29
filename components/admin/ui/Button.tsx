import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { bg, border, radius, text } from "./tokens";

/**
 * The admin button. One shape, 34px tall, on the control radius. Never a
 * pill: the floating bar is the only pill in admin and has its own buttons.
 *
 * - `primary` is the accent fill. One per bar, and it is the rightmost.
 * - `secondary` is the bordered white button beside it.
 * - `dashed` adds something that is not there yet: a filter, a field.
 * - `ink` is the dark fill, for the one action on a light hero card.
 * - `ghost` has no border and no fill, so it can sit inline next to a
 *   heading without reading as a second primary action.
 *
 * Deliberately separate from components/ui/button.tsx rather than replacing
 * it: that one is shared with the respondent study, the marketing pages and
 * NewStudyWizard. Admin imports from here; respondent and marketing import
 * from there; neither edits the other.
 */
const adminButtonVariants = cva(
  cn(
    "ds-control inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-colors",
    // The one focus treatment. Never remove an outline without this.
    "focus-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        primary: cn(bg.accent, text.onInk, "hover:bg-[color:hsl(var(--ds-accent)/0.9)]"),
        secondary: cn(
          "border",
          border.base,
          bg.base,
          text.ink3,
          "hover:bg-[color:hsl(var(--ds-bg-sidebar))]"
        ),
        dashed: cn(
          "border border-dashed",
          border.dashed,
          bg.base,
          text.muted,
          "hover:bg-[color:hsl(var(--ds-bg-sidebar))]"
        ),
        ink: cn(bg.ink, text.onInk, "hover:bg-[color:hsl(var(--ds-ink-2))]"),
        ghost: cn(text.muted2, "hover:text-[color:hsl(var(--ds-ink))]"),
      },
      size: {
        default: cn("h-[34px] px-[12px] [&_svg]:size-[14px]", radius.control),
        sm: cn("h-[30px] px-[10px] text-[12px] [&_svg]:size-[12px]", radius.chip),
      },
    },
    compoundVariants: [{ variant: "primary", size: "default", className: "px-[14px]" }],
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof adminButtonVariants> {
  /** Render as the single child element (e.g. a next/link) instead of a button. */
  asChild?: boolean;
  /**
   * A keyboard hint after the label, in mono. Not rendered with `asChild`,
   * where the child element owns its own content.
   */
  kbd?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant, size, asChild = false, kbd, children, ...props }, ref) => {
    const classes = cn(adminButtonVariants({ variant, size }), className);
    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button className={classes} ref={ref} {...props}>
        {children}
        {kbd && (
          <kbd aria-hidden className="ds-mono-kbd opacity-70">
            {kbd}
          </kbd>
        )}
      </button>
    );
  }
);
Button.displayName = "AdminButton";

export { adminButtonVariants };
