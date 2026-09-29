import * as React from "react";
import { cn } from "@/lib/utils";
import { bg, border, radius, text } from "./tokens";

const PADDING = {
  default: "p-5",
  compact: "p-4",
  flush: "",
} as const;

/**
 * The admin card. White ground, a 1px border, the card radius. No shadow:
 * borders do the separating on this surface.
 *
 * Padding is a prop rather than a second component. `flush` is for cards
 * whose child owns the edges (a table, a divided list), where padding would
 * inset the rows away from the border.
 *
 * `header` adds the 44px title row on the sidebar ground, with `headerAction`
 * as the accent link at its right edge. With a header the padding applies to
 * the body beneath it, not to the card.
 */
export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    padding?: "default" | "compact" | "flush";
    /** Marks a card that is itself a link: the ground tints on hover. */
    interactive?: boolean;
    /** The header row's title. */
    header?: React.ReactNode;
    /** Right side of the header row, typically one link. */
    headerAction?: React.ReactNode;
  }
>(({ className, padding = "default", interactive = false, header, headerAction, children, ...props }, ref) => {
  const hasHeader = header !== undefined && header !== null;
  return (
    <div
      ref={ref}
      className={cn(
        "border",
        radius.card,
        border.base,
        bg.base,
        text.ink,
        hasHeader ? "overflow-hidden" : PADDING[padding],
        !hasHeader && padding === "flush" && "overflow-hidden",
        interactive && "transition-colors hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
        className
      )}
      {...props}
    >
      {hasHeader ? (
        <>
          <div
            className={cn(
              "flex h-[44px] items-center justify-between gap-4 border-b px-5",
              border.base,
              bg.sidebar
            )}
          >
            <span className="ds-control min-w-0 truncate">{header}</span>
            {headerAction && (
              <span className={cn("ds-caption shrink-0 font-bold", text.accent)}>{headerAction}</span>
            )}
          </div>
          <div className={PADDING[padding]}>{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
});
Card.displayName = "AdminCard";
