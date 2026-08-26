import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The admin button. Three variants, one shape.
 *
 * Every button is a pill. The surface previously carried nine distinct button
 * shapes across two radii and five heights, including "primary actions" that
 * were bare anchors. A bare text link that triggers navigation is a `ghost`
 * button here, not an anchor styled at the call site.
 *
 * Deliberately separate from components/ui/button.tsx rather than replacing
 * it: that one is shared with the respondent survey, the marketing pages and
 * NewSurveyWizard, which are out of scope for this pass. Admin imports from
 * here; respondent and marketing import from there; neither edits the other.
 */
const adminButtonVariants = cva(
  cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill",
    "font-archivo font-semibold transition-colors",
    // The one focus treatment. Never remove an outline without this.
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0"
  ),
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-card text-card-foreground hover:bg-secondary",
        // No border and no fill, so it can sit inline next to a heading
        // without reading as a second primary action.
        ghost: "text-muted-foreground hover:text-card-foreground hover:underline",
      },
      size: {
        default: "h-10 px-5 text-sm [&_svg]:size-4",
        sm: "h-8 px-3.5 text-[13px] [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof adminButtonVariants> {
  /** Render as the single child element (e.g. a next/link) instead of a button. */
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(adminButtonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "AdminButton";

export { adminButtonVariants };
