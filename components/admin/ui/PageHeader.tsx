import { cn } from "@/lib/utils";

/**
 * The page masthead. Owns the header layout and the action alignment.
 *
 * Title row first, with the actions optically centred on the title; then one
 * optional meta line. The whole block stays under the height of two stat
 * cells, which is what keeps the first content block above the fold.
 *
 * - `eyebrow` is for detail pages only, where it names the parent object
 *   (usually as a link back to the list). Top-level pages pass none: the
 *   sidebar already states the location. Settings and Company profile are
 *   the exception, because neither has a nav item, so both carry "Account".
 * - `meta` is one line of fact: a count, a date, a parent name, a constraint.
 *   Not a sentence about the situation.
 * - `subtitle` survives for the one or two pages that need a sentence. Most
 *   pages should not pass it.
 * - No H1 carries a terminal period.
 */
export function PageHeader({
  eyebrow,
  title,
  badge,
  meta,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-1", className)}>
      {eyebrow && <p className="type-eyebrow">{eyebrow}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {/* Stripped rather than asserted: a title passed in with a period
              would otherwise reintroduce the one inconsistency this role
              exists to prevent. */}
          <h1 className="type-page-title">{title.replace(/\.$/, "")}</h1>
          {badge}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {meta && <div className="type-meta">{meta}</div>}
      {subtitle && <div className="type-subhead mt-1">{subtitle}</div>}
    </header>
  );
}
