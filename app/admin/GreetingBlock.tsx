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
      {/* Non-breaking spaces hold both lines' height on the first frame,
          before the client clock fills in — no layout shift on mount. */}
      <div className="mb-2.5 type-label">{dateLabel || " "}</div>
      <h1 className="type-page-title">
        {time ? (
          <>
            Good {time}
            {firstName ? `, ${firstName}.` : "."}
          </>
        ) : (
          " "
        )}
      </h1>
    </div>
  );
}
