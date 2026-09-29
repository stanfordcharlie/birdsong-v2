import { Badge } from "@/components/admin/ui";
import { dot } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";

/**
 * The three connection states, and no others. HubSpot sync is manual, so
 * nothing here ever says "Synced".
 */
export type ConnectionStatus = "connected" | "disconnected" | "error";

const PILLS: Record<ConnectionStatus, { label: string; variant: "accent" | "count"; dot: string }> = {
  connected: { label: "Connected", variant: "accent", dot: dot.accent },
  disconnected: { label: "Not connected", variant: "count", dot: dot.muted3 },
  error: { label: "Error", variant: "count", dot: dot.danger },
};

export function StatusPill({ status, className }: { status: ConnectionStatus; className?: string }) {
  const pill = PILLS[status];
  return (
    <Badge variant={pill.variant} className={className}>
      <span aria-hidden className={cn("h-[6px] w-[6px] shrink-0 rounded-full", pill.dot)} />
      {pill.label}
    </Badge>
  );
}
