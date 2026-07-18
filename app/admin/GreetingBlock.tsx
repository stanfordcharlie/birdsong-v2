"use client";

import { useEffect, useState } from "react";

function timeOfDay(d: Date): "morning" | "afternoon" | "evening" {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// The server renders at request time in the server's own timezone (UTC on
// Vercel), which would make "Good morning" wrong for most visitors half the
// day. Computed client-side instead, from the browser's actual clock —
// state starts empty so the server- and first-client-render markup match
// (no hydration mismatch), then fills in on mount, well before the rise-in
// animation's own opacity delay makes it visible.
export function GreetingBlock({ firstName }: { firstName: string | null }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const dateLabel = now ? formatDateLabel(now) : "";
  const time = now ? timeOfDay(now) : null;

  return (
    <div className="bs-rise-1">
      <div className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">
        {dateLabel}
      </div>
      <h1 className="font-serif text-[clamp(44px,4.6vw,66px)] font-normal leading-[1.06] tracking-[-0.005em] text-sidebar-foreground">
        Good
        <br />
        {time}
        {firstName ? (
          <>
            ,<br />
            {firstName}.
          </>
        ) : (
          "."
        )}
      </h1>
    </div>
  );
}
