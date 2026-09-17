"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Set-once configuration on a detail page.
 *
 * A study's audience, its question list and the fields it collects are read
 * roughly once, at setup, and then never again — but on the study detail page
 * they occupied more vertical space than the responses the page exists to
 * show, which put the first response row below the fold. Collapsed, each
 * section keeps a one-line summary, so the information is still on the page
 * without being the page.
 *
 * The summary is the collapsed state's whole job: a disclosure that says only
 * "Questions" makes you open it to find out whether it is worth opening.
 *
 * Markup note: the header is one full-width disclosure button, and `action`
 * is a sibling layered over it rather than a child, because a button inside a
 * button is invalid and a nested control would not receive its own clicks.
 */
export function CollapsibleSection({
  title,
  summary,
  action,
  defaultOpen = false,
  children,
  className,
}: {
  title: string;
  /** One line, shown only while collapsed. Truncates rather than wraps. */
  summary?: string;
  /** Right-aligned, typically a quiet text link. */
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div className={cn("border-b border-border last:border-b-0", className)}>
      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((previous) => !previous)}
          className={cn(
            "focus-ring flex h-12 w-full items-center gap-4 rounded-control text-left",
            // Reserves room for the action so a long summary truncates before
            // it runs underneath the link rather than after.
            action ? "pr-28" : "pr-8"
          )}
        >
          <span className="type-eyebrow shrink-0">{title}</span>
          {!open && summary && (
            <span className="min-w-0 flex-1 truncate font-archivo text-control text-muted-foreground">
              {summary}
            </span>
          )}
          <Chevron open={open} />
        </button>
        {action && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">{action}</div>
        )}
      </div>

      {open && (
        <div id={bodyId} className="pb-3 pt-2">
          {children}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "absolute right-0 top-1/2 h-4 w-4 shrink-0 -translate-y-1/2 text-faint transition-transform duration-150",
        open && "rotate-180"
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
