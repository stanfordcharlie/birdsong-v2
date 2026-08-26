import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The admin card. Background, border, radius, shadow, padding.
 *
 * Padding is a prop rather than a second component: the surface previously
 * carried six card treatments across three radii, with the shadow present,
 * absent or hover-only depending on which page you were on.
 *
 * `flush` is for cards whose child owns the edges (a table, a divided list),
 * where padding would inset the rows away from the border.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    padding?: "default" | "compact" | "flush";
    /** Adds the hover lift used by cards that are themselves links. */
    interactive?: boolean;
  }
>(({ className, padding = "default", interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-card border border-border bg-card text-card-foreground shadow-card",
      padding === "default" && "p-6",
      padding === "compact" && "p-4",
      padding === "flush" && "overflow-hidden",
      interactive && "transition-shadow hover:shadow-card-hover",
      className
    )}
    {...props}
  />
));
Card.displayName = "AdminCard";
