import { cn } from "@/lib/utils";

/**
 * The page masthead. Owns the header layout and the action alignment.
 *
 * Every admin page's header is this component, so the eyebrow, the H1 and the
 * actions cannot drift apart again. Three things it enforces:
 *
 * - The eyebrow is a section name matching the sidebar nav label. It is not a
 *   live status readout (Surveys used to put "3 LIVE RIGHT NOW" here) and not
 *   a different word from the nav item that reached the page (Company profile
 *   used to say "SETTINGS").
 * - No H1 carries a terminal period.
 * - The subhead measure is 52ch, set by the role, so the same sentence wraps
 *   identically on every page.
 *
 * `badge` is the count treatment that sits beside the title; anything that is
 * a live readout belongs there rather than in the eyebrow.
 */
export function PageHeader({
  eyebrow,
  title,
  badge,
  subtitle,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-2", className)}>
      <p className="type-eyebrow">{eyebrow}</p>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Stripped rather than asserted: a title passed in with a period
                would otherwise reintroduce the one inconsistency this role
                exists to prevent. */}
            <h1 className="type-page-title">{title.replace(/\.$/, "")}</h1>
            {badge}
          </div>
          {subtitle && <div className="type-subhead mt-3">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3 sm:pt-2">{actions}</div>}
      </div>
    </header>
  );
}
