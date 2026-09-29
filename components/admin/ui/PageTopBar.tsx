"use client";

import { createContext, useContext } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { text } from "./tokens";

export type Crumb = {
  label: React.ReactNode;
  /** Parents link back; the last crumb is the current page and does not. */
  href?: string;
};

/**
 * Where a page's top bar content lands. AdminShell owns the 56px bar and
 * provides the element inside it; PageTopBar portals into that element. Null
 * until the shell has mounted, and outside the shell altogether.
 */
export const TopBarSlotContext = createContext<HTMLElement | null>(null);

/** The breadcrumb: parents in muted-2 with a slash between, the page in ink at 700. */
export function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex min-w-0 items-center gap-2 text-[13px]", text.muted2)}>
      {crumbs.map((crumb, i) => {
        const current = i === crumbs.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {current ? (
              <span aria-current="page" className={cn("truncate font-bold", text.ink)}>
                {crumb.label}
              </span>
            ) : crumb.href ? (
              <Link
                href={crumb.href}
                className="focus-ring truncate rounded-[var(--ds-radius-chip)] hover:text-[color:hsl(var(--ds-ink))]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="truncate">{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** The layout of the bar's content: breadcrumb left, actions right. */
export function TopBarContent({ crumbs, actions }: { crumbs: Crumb[]; actions?: React.ReactNode }) {
  return (
    <div className="flex h-full min-w-0 flex-1 items-center justify-between gap-4">
      <Crumbs crumbs={crumbs} />
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * A page's top bar: its breadcrumb and its actions.
 *
 * Render it anywhere in the page. It draws nothing in place; the content
 * appears in the shell's top bar, replacing the breadcrumb the shell derives
 * from the route. A page that renders none keeps that default, so only a
 * page with a name of its own (a study, a lead) or with actions needs one.
 *
 * The primary action goes last in `actions` and is the only accent fill in
 * the bar.
 */
export function PageTopBar({ crumbs, actions }: { crumbs: Crumb[]; actions?: React.ReactNode }) {
  const slot = useContext(TopBarSlotContext);
  if (!slot) return null;
  return createPortal(<TopBarContent crumbs={crumbs} actions={actions} />, slot);
}
