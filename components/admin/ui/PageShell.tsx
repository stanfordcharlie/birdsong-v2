import { cn } from "@/lib/utils";

/**
 * The container. Every admin page's outermost element.
 *
 * There is exactly one width for the whole admin surface, so this takes no
 * size prop: a page that needs a tighter measure wraps the BLOCK that needs
 * it in `.admin-measure`, never the page. That is the rule that keeps every
 * admin H1 on the same x coordinate.
 */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("admin-container flex flex-col", className)}>{children}</div>;
}
