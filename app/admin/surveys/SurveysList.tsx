"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterTabs,
  RelativeTime,
  SearchInput,
  StatusDot,
} from "@/components/admin/ui";
import { EMPTY_VALUE, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SurveyRowActions } from "./SurveyRowActions";

export type SurveyListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  /** survey.num_questions, the target topic count, null on older rows. */
  questionCount: number | null;
  responseCount: number;
  completedCount: number;
  /** Completed and scored at or above the worth-a-call line. */
  qualifiedCount: number;
  lastResponseAt: string | null;
  /** Responses per equal slice of the study's lifetime, oldest first. */
  activity: number[];
  createdAt: string;
  archivedAt: string | null;
};

type StatusFilter = "all" | "live" | "draft" | "archived";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

// Shared by the tab counts and the grid so a tab can never promise a number
// the grid then contradicts.
function matchesStatus(survey: SurveyListItem, filter: StatusFilter): boolean {
  const isArchived = survey.archivedAt !== null;
  // "Live" and "Draft" exclude archived studies; "All" is everything the
  // account holds, which is the number the page header also states.
  if (filter === "archived") return isArchived;
  if (filter === "all") return true;
  if (isArchived) return false;
  if (filter === "live") return survey.status === "live";
  return survey.status !== "live";
}

type Status = "live" | "draft" | "archived";

function statusOf(survey: SurveyListItem): Status {
  if (survey.archivedAt !== null) return "archived";
  return survey.status === "live" ? "live" : "draft";
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "live") {
    return (
      <Badge variant="live">
        <StatusDot live />
        Live
      </Badge>
    );
  }
  return (
    <Badge variant={status === "draft" ? "draft" : "outline"}>
      {status === "draft" ? "Draft" : "Archived"}
    </Badge>
  );
}

// Response volume across the study's lifetime, one bar per slice. A study
// with nothing to show draws the same row at the baseline so every card has
// the same anatomy and the grid keeps its rhythm.
function ActivityBars({ activity, live }: { activity: number[]; live: boolean }) {
  const max = Math.max(0, ...activity);
  return (
    <div aria-hidden className="flex h-4 items-end gap-1">
      {activity.map((count, i) => {
        const ratio = max > 0 ? count / max : 0;
        return (
          <span
            key={i}
            className={cn(
              "w-1.5 flex-none rounded-pill",
              count > 0 ? (live ? "bg-brand-live" : "bg-faint") : "bg-border"
            )}
            style={{ height: `${Math.max(12.5, ratio * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function StudyCard({ survey, canManage }: { survey: SurveyListItem; canManage: boolean }) {
  const status = statusOf(survey);
  const completion = survey.responseCount > 0 ? survey.completedCount / survey.responseCount : null;

  return (
    <Card interactive className="relative flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          {/* The title is the card's link, stretched over the whole card;
              the actions menu sits above it so its clicks stay its own. */}
          <h2 className="type-heading min-w-0">
            <Link
              href={`/admin/surveys/${survey.id}`}
              className="focus-ring rounded-control after:absolute after:inset-0 after:rounded-card"
            >
              {survey.title}
            </Link>
          </h2>
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            <StatusBadge status={status} />
            {canManage && (
              <SurveyRowActions
                surveyId={survey.id}
                internalName={survey.title}
                slug={survey.slug}
                status={survey.status}
                archivedAt={survey.archivedAt}
                responseCount={survey.responseCount}
              />
            )}
          </div>
        </div>
        <p className="type-meta">
          {survey.questionCount !== null ? plural(survey.questionCount, "question") : EMPTY_VALUE}
          {" · "}created {formatDate(survey.createdAt)}
        </p>
      </div>

      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <dd className="type-metric-value">{survey.responseCount}</dd>
          <dt className="type-meta">responses</dt>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dd className="font-archivo text-sm font-semibold tabular-nums">
            {completion === null ? EMPTY_VALUE : formatPercent(completion)}
          </dd>
          <dt className="type-meta">completion</dt>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dd
            className={cn(
              "font-archivo text-sm font-semibold tabular-nums",
              survey.qualifiedCount > 0 && "text-brand-text"
            )}
          >
            {survey.qualifiedCount}
          </dd>
          <dt className="type-meta">qualified</dt>
        </div>
      </dl>

      <ActivityBars activity={survey.activity} live={status === "live"} />

      <p className="type-meta">
        {survey.lastResponseAt ? (
          <>
            Last response <RelativeTime date={survey.lastResponseAt} />
          </>
        ) : status === "draft" ? (
          "Not sent yet"
        ) : (
          "No responses yet"
        )}
      </p>
    </Card>
  );
}

export function SurveysList({
  surveys,
  initialStatusFilter = "all",
  canManage = true,
  newStudyHref,
}: {
  surveys: SurveyListItem[];
  // Deep-link from the admin home, e.g. ?status=live.
  initialStatusFilter?: StatusFilter;
  // From can(role, "study:edit"/"study:delete") on the server. False hides
  // the per-study menu: a member reads the list and opens studies.
  canManage?: boolean;
  /** Where the empty state sends someone; null hides its action. */
  newStudyHref: string | null;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveys.filter((survey) => {
      if (!matchesStatus(survey, statusFilter)) return false;
      if (q && !survey.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [surveys, query, statusFilter]);

  // Tab counts ignore the search box: they describe what the account holds,
  // and a tab reading "Live 0" mid-search would look like the studies went
  // away rather than like the query not matching them.
  const statusCounts = useMemo(() => {
    const counts = {} as Record<StatusFilter, number>;
    for (const filter of FILTERS) {
      counts[filter.value] = surveys.filter((s) => matchesStatus(s, filter.value)).length;
    }
    return counts;
  }, [surveys]);

  if (surveys.length === 0) {
    return (
      <EmptyState
        className="py-2"
        title="No studies yet. Start one and Birdsong runs the interviews."
        action={
          newStudyHref ? (
            <Button asChild>
              <Link href={newStudyHref}>New study</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          label="Filter studies by status"
          tabs={FILTERS.map((f) => ({ ...f, count: statusCounts[f.value] }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search studies"
          label="Search studies by name"
          className="sm:w-72 sm:flex-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState className="py-2" title="No studies match." />
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((survey) => (
            <li key={survey.id} className="min-w-0">
              <StudyCard survey={survey} canManage={canManage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
