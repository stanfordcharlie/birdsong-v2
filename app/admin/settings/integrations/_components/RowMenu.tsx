"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";
import { text } from "@/components/admin/ui/tokens";
import { cn } from "@/lib/utils";
import { KebabButton, Menu, MenuItem } from "./Menu";

/**
 * The row's kebab. "View details" on every row. "Disconnect" only where a
 * route to do it already exists: Slack's webhook is cleared by the same
 * route that saves it (POST /api/settings/slack-webhook with a null URL).
 * HubSpot's token lives on the server, so its row has no disconnect.
 *
 * Disconnect is two steps: the item swaps for a confirm row inside the
 * menu, and only the second click sends the request.
 */
export function RowMenu({
  name,
  detailsHref,
  disconnect,
}: {
  name: string;
  detailsHref: string;
  disconnect?: { kind: "slack-webhook" } | null;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runDisconnect(close: () => void) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/slack-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: null }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || `Slack returned ${res.status}`);
      close();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Menu
      label={`${name} actions`}
      align="end"
      width={224}
      trigger={({ open, ref, ...props }) => (
        <KebabButton open={open} ref={ref} label={`${name} actions`} {...props} />
      )}
    >
      {(close) => (
        <>
          <MenuItem href={detailsHref} onSelect={close}>
            View details
          </MenuItem>
          {disconnect && !confirming && (
            <MenuItem onSelect={() => setConfirming(true)}>Disconnect</MenuItem>
          )}
          {disconnect && confirming && (
            <div className="flex flex-col gap-2 px-[10px] pb-[6px] pt-[8px]">
              <p className={cn("text-[12px] leading-[1.45]", text.muted2)}>
                Lead alerts stop until a new webhook is saved.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ink"
                  disabled={pending}
                  onClick={() => runDisconnect(close)}
                >
                  {pending ? "Disconnecting" : "Disconnect"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                >
                  Keep
                </Button>
              </div>
              {error && (
                <p role="alert" className={cn("text-[12px] leading-[1.45]", text.ink)}>
                  {error}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Menu>
  );
}
