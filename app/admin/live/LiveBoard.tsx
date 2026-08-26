"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  StatusDot,
  type Column,
} from "@/components/admin/ui";
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
  if (step === 0) return "Getting started";
  if (target === null) return step === 1 ? "1 question" : `${step} questions`;
  if (step > target) return `${step}, past the ${target} planned`;
  return `${step} of ${target}`;
}

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
        // presenceState() is typed as bare presence refs, since what each
        // client tracks is its own business. The validator below is what
        // turns that back into something this page can render.
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
      <Card padding="flush">
        <EmptyState
          title="No live surveys right now"
          description="Set a survey to live and anyone who opens its link will show up here while they are being interviewed."
          action={
            <Button asChild variant="secondary">
              <Link href="/admin/surveys">Go to your surveys</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const columns: Column<LiveRow>[] = [
    {
      key: "respondent",
      header: "Respondent",
      cell: (row) => (
        <span className="flex items-center gap-2.5">
          <StatusDot live={!row.isStale} pulse />
          <span className="font-medium">{row.respondent_name || "Anonymous"}</span>
          {row.isStale && (
            <Badge variant="outline" size="sm" title="No heartbeat in the last 30 seconds.">
              Inactive
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "survey",
      header: "Survey",
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
      header: "Questions asked",
      width: "180px",
      cell: (row) => (
        <span className="flex flex-col gap-1.5">
          <span>{formatProgress(row.current_step, row.questionTarget)}</span>
          {row.questionTarget !== null && row.questionTarget > 0 && (
            <span aria-hidden className="block h-[3px] w-24 rounded-pill bg-chip">
              <span
                className="block h-full rounded-pill bg-brand"
                style={{
                  width: `${Math.min(100, Math.round((row.current_step / row.questionTarget) * 100))}%`,
                }}
              />
            </span>
          )}
        </span>
      ),
    },
    {
      key: "last",
      header: "Last activity",
      align: "right",
      width: "128px",
      cell: (row) => (
        <span className="text-muted-foreground" suppressHydrationWarning>
          {formatRelativeTime(Date.now() - row.sinceMs, { seconds: true })}
        </span>
      ),
    },
    {
      key: "transcript",
      header: "Transcript",
      align: "right",
      width: "128px",
      // Read-only view of this interview as it happens. The row id is the
      // response id, which is what the detail page reads (under the owner's
      // own session).
      cell: (row) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/live/${row.response_id}`}>Watch live</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Only ever a positive count. This line used to also render "Nobody is
          in an interview right now" while the table below said the same thing
          in different words, so the page printed its empty state twice at
          once. Saying nothing here leaves EmptyState as the single voice. */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2.5">
          <StatusDot live pulse />
          <span className="type-body text-muted-foreground" suppressHydrationWarning>
            {activeCount === 1
              ? "1 person is being interviewed right now"
              : `${activeCount} people are being interviewed right now`}
          </span>
        </div>
      )}

      <Card padding="flush">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.response_id}
          // Inactive rows stay put rather than disappearing: a reconnect or a
          // backgrounded tab can stop the heartbeat for a while without the
          // respondent having left, and rows vanishing and returning would
          // read as flicker.
          rowClassName={(row) => (row.isStale ? "opacity-55" : undefined)}
          empty={{
            title: now === null ? "Connecting" : "Nobody is in an interview right now",
            description:
              now === null
                ? "Connecting to your live surveys."
                : "This list updates on its own as respondents open your links.",
          }}
        />
      </Card>
    </div>
  );
}
