import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Count and status pills.
 *
 * One shape for both jobs. `count` is the neutral treatment already used
 * beside the Leads H1; `accent` is the tinted one the Home page used for
 * "N waiting". Separate from components/ui/badge.tsx, which the respondent
 * survey imports and this pass does not touch.
 */
const adminBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill font-archivo font-semibold",
  {
    variants: {
      variant: {
        count: "bg-chip text-muted-foreground",
        accent: "bg-brand-weak text-brand-text",
        // Status, not accent: these carry meaning rather than emphasis.
        live: "bg-brand-weak text-brand-text",
        draft: "bg-chip text-muted-foreground",
        warning: "bg-warning/10 text-warning-foreground",
        outline: "border border-border text-muted-foreground",
      },
      size: {
        default: "px-2.5 py-1 text-[13px]",
        sm: "px-2 py-0.5 text-[11.5px]",
      },
    },
    defaultVariants: { variant: "count", size: "default" },
  }
);

export interface AdminBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof adminBadgeVariants> {}

export function Badge({ className, variant, size, ...props }: AdminBadgeProps) {
  return <span className={cn(adminBadgeVariants({ variant, size }), className)} {...props} />;
}

export { adminBadgeVariants };
