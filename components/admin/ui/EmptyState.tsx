import { cn } from "@/lib/utils";

/**
 * Renders once, inside the container it belongs to.
 *
 * "Once" is the whole point: the Live board printed its empty state twice at
 * the same time, in different wording, once above the table and once inside
 * it. This component carries no card or border of its own so it can sit
 * inside whatever already owns the edges (a Card, a table cell), which is
 * what makes a second copy outside that container obviously wrong.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <p className="type-heading">{title}</p>
      {description && <p className="type-body max-w-[46ch] text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
