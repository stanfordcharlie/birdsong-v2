"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, DataTable, EmptyState, StatusDot, type Column } from "@/components/admin/ui";
import { createClient } from "@/lib/supabase/client";
import {
  isSurveyPresence,
  PRESENCE_STALE_MS,
  surveyPresenceChannel,
  type SurveyPresence,
} from "@/lib/presence/survey-presence";
import { formatRelativeTime } from "@/lib/format";

export type LiveSurvey = {
  id: string;
  // Internal admin name, matching how every other admin table labels a survey.
  title: string;
  slug: string;
  // The survey's planned question count. A soft target, not a cap: the
  // interviewer can run past it, which the progress label accounts for.
  questionTarget: number | null;
};

type LiveRow = SurveyPresence & {
  surveyId: string;
  surveyTitle: string;
  questionTarget: number | null;
  isStale: boolean;
  sinceMs: number;
};

// "4 of 8" while the interview is inside its planned length. Past that the
// count is still true but the fraction stops being, so the target is named
// as a target instead of pretending to be a denominator.
function formatProgress(step: number, target: number | null): string {
  if (step === 0) return "Starting";
  if (target === null) return String(step);
  if (step > target) return `${step} of ${target} planned`;
  return `${step} of ${target}`;
}

const COLUMNS: Column<LiveRow>[] = [
  {
    key: "respondent",
    header: "Respondent",
    cell: (row) => (
      <span className="inline-flex items-center gap-2">
        <StatusDot live={!row.isStale} pulse />
        <span className="font-medium">{row.respondent_name || "Anonymous"}</span>
        {/* Status once per row: the dot plus this word. The tooltip carries
            the definition of inactive. */}
        {row.isStale && (
          <span className="text-muted-foreground" title="No heartbeat in the last 30 seconds">
            Inactive
          </span>
        )}
      </span>
    ),
  },
  {
    key: "survey",
    header: "Study",
    cell: (row) => (
      <Link
        href={`/survey/${row.slug}`}
        target="_blank"
        rel="noreferrer"
        className="focus-ring rounded-control text-muted-foreground hover:text-card-foreground"
        title={`Open /survey/${row.slug}`}
      >
        {row.surveyTitle}
      </Link>
    ),
  },
  {
    key: "progress",
    header: "Questions",
    align: "right",
    width: "lg",
    cell: (row) => formatProgress(row.current_step, row.questionTarget),
  },
  {
    key: "last",
    header: "Last activity",
    align: "right",
    width: "md",
    cell: (row) => (
      <span className="text-muted-foreground" suppressHydrationWarning>
        {formatRelativeTime(Date.now() - row.sinceMs, { seconds: true })}
      </span>
    ),
  },
];

export function LiveBoard({ surveys }: { surveys: LiveSurvey[] }) {
  // Presence entries per survey id, replaced wholesale on every sync (the
  // sync event carries the full state for that channel, so there is nothing
  // to merge).
  const [presenceBySurvey, setPresenceBySurvey] = useState<Record<string, SurveyPresence[]>>({});
  // Drives the relative times and the stale check. Presence does not push an
  // event when a heartbeat simply stops arriving, so the clock has to tick
  // on its own for a row to go inactive.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (surveys.length === 0) return;

    const supabase = createClient();
    // One subscription per live survey. This page only ever joins channels
    // for surveys it just loaded from the database under the owner's own
    // session, so it cannot watch anyone else's.
    const channels = surveys.map((survey) => {
      const channel = supabase.channel(surveyPresenceChannel(survey.id));
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const entries = (Object.values(state).flat() as unknown[]).filter(isSurveyPresence);
        setPresenceBySurvey((prev) => ({ ...prev, [survey.id]: entries }));
      });
      // Subscribe without track(): an admin watching is not a participant,
      // so nothing about this page is published back to respondents.
      channel.subscribe();
      return channel;
    });

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [surveys]);

  const rows: LiveRow[] = useMemo(() => {
    if (now === null) return [];
    const bySurvey = new Map(surveys.map((survey) => [survey.id, survey]));
    const flattened: LiveRow[] = [];
    for (const [surveyId, entries] of Object.entries(presenceBySurvey)) {
      const survey = bySurvey.get(surveyId);
      if (!survey) continue;
      for (const entry of entries) {
        const parsed = Date.parse(entry.last_active);
        // An unparseable or future timestamp comes from another client, so
        // it is clamped rather than trusted into a negative age.
        const sinceMs = Number.isNaN(parsed) ? PRESENCE_STALE_MS : Math.max(0, now - parsed);
        flattened.push({
          ...entry,
          surveyId,
          surveyTitle: survey.title,
          questionTarget: survey.questionTarget,
          isStale: sinceMs > PRESENCE_STALE_MS,
          sinceMs,
        });
      }
    }
    // Active first, then most recently active, so the rows worth watching
    // stay at the top and stale ones settle underneath.
    return flattened.sort((a, b) => {
      if (a.isStale !== b.isStale) return a.isStale ? 1 : -1;
      return a.sinceMs - b.sinceMs;
    });
  }, [presenceBySurvey, surveys, now]);

  const activeCount = rows.filter((row) => !row.isStale).length;

  if (surveys.length === 0) {
    return (
      <EmptyState
        title="No live studies."
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/surveys">Open studies</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Only ever a positive count, so the empty state stays the single
          voice when nobody is here. */}
      {activeCount > 0 && (
        <p className="type-meta tabular-nums" suppressHydrationWarning>
          {activeCount} in an interview now
        </p>
      )}

      <DataTable
        columns={COLUMNS}
        rows={rows}
        rowKey={(row) => row.response_id}
        // Read-only view of this interview as it happens. The row id is the
        // response id, which is what the detail page reads.
        rowHref={(row) => `/admin/live/${row.response_id}`}
        // Inactive rows stay put rather than disappearing: a reconnect or a
        // backgrounded tab can stop the heartbeat for a while without the
        // respondent having left, and rows vanishing and returning would
        // read as flicker.
        rowClassName={(row) => (row.isStale ? "opacity-55" : undefined)}
        empty={{ title: now === null ? "Connecting." : "Nobody is in an interview." }}
      />
    </div>
  );
}
