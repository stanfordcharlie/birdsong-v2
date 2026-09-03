import { cn } from "@/lib/utils";

/**
 * One sentence, one optional action, no chrome of its own.
 *
 * Renders once, inside whatever already owns the space. It carries no card,
 * no border and no second explanatory line: the sentence says what is absent
 * and the action, if any, is the one thing that changes that. DataTable
 * renders this bare (no column headers, no frame) when it has no rows, so an
 * empty table never frames its own emptiness.
 */
export function EmptyState({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-3 py-6", className)}>
      <p className="type-body text-muted-foreground">{title}</p>
      {action}
    </div>
  );
}
