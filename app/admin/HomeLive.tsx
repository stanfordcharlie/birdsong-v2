"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusDot, Waveform } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import { createClient } from "@/lib/supabase/client";
import { excludeDeletedResponses } from "@/lib/responses/visibility";
import {
  isStudyPresence,
  PRESENCE_STALE_MS,
  studyPresenceChannel,
  type StudyPresence,
} from "@/lib/presence/study-presence";
import { cn } from "@/lib/utils";

// Live now, on Home. The roster is the Live page's: Supabase Realtime
// Presence, one channel per live study (lib/presence/study-presence.ts),
// read in the browser and never stored. Presence carries the step the
// respondent is on and a heartbeat; when the interview started is the
// response row's created_at, read once per interview.

export type HomeLiveStudy = {
  id: string;
  title: string;
  /** The length preset's topic count: what the step is out of. */
  topics: number;
};

type LiveRow = StudyPresence & {
  studyTitle: string;
  topics: number;
  stale: boolean;
  sinceMs: number;
};

const CARD = cn("overflow-hidden border", radius.hero, border.base, bg.base);
const LINE = cn("border-t px-5 py-4 text-[14px]", border.base, text.muted2);

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function HomeLive({ studies, enterDelayMs }: { studies: HomeLiveStudy[]; enterDelayMs: number }) {
  const [presenceByStudy, setPresenceByStudy] = useState<Record<string, StudyPresence[]>>({});
  const [startedAt, setStartedAt] = useState<Record<string, number>>({});
  // Presence sends nothing when a heartbeat simply stops, so the clock ticks
  // on its own: it drives the elapsed time and the stale check.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (studies.length === 0) return;
    const supabase = createClient();
    // Subscribed without track(): watching is not taking part.
    const channels = studies.map((study) => {
      const channel = supabase.channel(studyPresenceChannel(study.id));
      channel.on("presence", { event: "sync" }, () => {
        const entries = (Object.values(channel.presenceState()).flat() as unknown[]).filter(isStudyPresence);
        setPresenceByStudy((prev) => ({ ...prev, [study.id]: entries }));
      });
      channel.subscribe();
      return channel;
    });
    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [studies]);

  const presentIds = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(presenceByStudy)
            .flat()
            .map((entry) => entry.response_id)
        )
      ).sort(),
    [presenceByStudy]
  );
  const presentKey = presentIds.join(",");

  // When each interview began. One read per interview that appears; the
  // org-member policy on responses is what scopes it.
  useEffect(() => {
    const missing = presentKey.split(",").filter((id) => id && !(id in startedAt));
    if (missing.length === 0) return;
    let cancelled = false;
    const supabase = createClient();
    excludeDeletedResponses(
      supabase.from("responses").select("id, created_at").in("id", missing)
    )
      .then(({ data }) => {
        if (cancelled || !data) return;
        setStartedAt((prev) => {
          const next = { ...prev };
          for (const row of data) next[row.id] = new Date(row.created_at).getTime();
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
    // startedAt is read, not watched: a row that has arrived is never asked
    // for again, and watching it would refetch on every arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentKey]);

  const rows: LiveRow[] = useMemo(() => {
    if (now === null) return [];
    const byId = new Map(studies.map((study) => [study.id, study]));
    const flattened: LiveRow[] = [];
    for (const [studyId, entries] of Object.entries(presenceByStudy)) {
      const study = byId.get(studyId);
      if (!study) continue;
      for (const entry of entries) {
        const parsed = Date.parse(entry.last_active);
        const sinceMs = Number.isNaN(parsed) ? PRESENCE_STALE_MS : Math.max(0, now - parsed);
        flattened.push({
          ...entry,
          studyTitle: study.title,
          topics: study.topics,
          stale: sinceMs > PRESENCE_STALE_MS,
          sinceMs,
        });
      }
    }
    return flattened.sort((a, b) => {
      if (a.stale !== b.stale) return a.stale ? 1 : -1;
      return a.sinceMs - b.sinceMs;
    });
  }, [presenceByStudy, studies, now]);

  const running = rows.some((row) => !row.stale);

  return (
    <section
      className={cn("ds-enter", CARD)}
      style={{ "--ds-enter-delay": `${enterDelayMs}ms` } as React.CSSProperties}
    >
      <div className={cn("flex h-[48px] items-center justify-between px-5", bg.sidebar)}>
        <h2 className="ds-control flex items-center gap-[10px]">
          {/* The dot pulses only while something is running. */}
          <StatusDot live pulse={running} />
          Live now
        </h2>
        <Link
          href="/admin/live"
          className={cn("focus-ring text-[12px] font-bold", radius.chip, text.accent)}
        >
          Watch
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className={LINE}>No interviews running.</p>
      ) : (
        rows.map((row) => {
          const started = startedAt[row.response_id];
          return (
            <Link
              key={row.response_id}
              href={`/admin/live/${row.response_id}`}
              className={cn(
                "focus-ring grid h-[60px] grid-cols-[minmax(0,1fr)_160px_120px] items-center gap-5 border-t px-5 transition-colors hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
                border.base
              )}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[14px] font-bold">{row.studyTitle}</span>
                <span className={cn("truncate text-[12px]", text.muted2)}>
                  {row.stale
                    ? "Inactive"
                    : row.current_step === 0
                      ? "Warming up"
                      : (
                          <>
                            Topic <span className="font-mono">{row.current_step}</span> of{" "}
                            <span className="font-mono">{row.topics}</span>
                          </>
                        )}
                </span>
              </span>
              <Waveform
                seed={row.response_id}
                bars={24}
                height={28}
                live={!row.stale}
                tone={row.stale ? "muted" : "light"}
              />
              <span className={cn("ds-mono-count text-right", text.muted2)} suppressHydrationWarning>
                Turn {row.current_step}
                {started !== undefined && now !== null && ` · ${formatElapsed(now - started)}`}
              </span>
            </Link>
          );
        })
      )}
    </section>
  );
}
