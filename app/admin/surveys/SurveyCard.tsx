"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge, StatusDot } from "@/components/admin/ui";
import { EMPTY_VALUE, formatDate, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SurveyRowActions } from "./SurveyRowActions";
import type { SurveyListItem } from "./SurveysList";

// Three flat cover fills, picked deterministically per survey so a card keeps
// the same cover across reloads, sorts and filters — the cover is how you
// re-find a survey in the grid, so it has to be stable.
//
// This replaces six invented three-stop gradients, two of which ("sand" and
// "blush") were the tan and cream this design pass bans. Flat rather than
// gradient, and drawn from the neutral and accent families, because the cover
// sits behind a status pill and above the title and a bright fill out-shouts
// both. They are decoration that makes cards distinguishable at a glance, not
// a signal to read.
const COVERS = ["bg-cover-1", "bg-cover-2", "bg-cover-3"] as const;

// FNV-1a over the survey id. Any stable hash would do; this one is short,
// dependency-free and spreads sequential UUIDs across all three buckets.
function coverFor(id: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return COVERS[hash % COVERS.length];
}

function initialsOf(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return EMPTY_VALUE;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Seven bars, one per day, oldest first. Height carries the count and opacity
// rides along with it, so a quiet week reads as a flat pale row rather than
// as a chart that failed to load.
function Sparkbars({ days }: { days: number[] }) {
  const peak = Math.max(...days, 1);
  return (
    <span aria-hidden className="flex h-[22px] items-end gap-1">
      {days.map((count, i) => {
        const ratio = count / peak;
        return (
          <span
            key={i}
            className="w-[4px] shrink-0 rounded-pill bg-card-foreground"
            style={{
              height: `${Math.max(3, Math.round(ratio * 22))}px`,
              opacity: 0.18 + ratio * 0.42,
            }}
          />
        );
      })}
    </span>
  );
}

function StatusPill({ status, archived }: { status: string; archived: boolean }) {
  const label = archived ? "Archived" : status === "live" ? "Live" : "Draft";
  // Carries its own opaque ground rather than relying on contrast with the
  // cover behind it.
  return (
    <Badge variant="count" size="sm" className="bg-card/90 text-card-foreground backdrop-blur-sm">
      <StatusDot live={!archived && status === "live"} />
      {label}
    </Badge>
  );
}

export function SurveyCard({
  survey,
  selected,
  onToggleSelect,
}: {
  survey: SurveyListItem;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const isArchived = survey.archivedAt !== null;
  const created = formatDate(survey.createdAt);

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-card border bg-card transition-shadow",
        selected ? "border-primary ring-1 ring-inset ring-primary" : "border-border shadow-card hover:shadow-card-hover"
      )}
    >
      <div className={cn("relative h-[150px] shrink-0", coverFor(survey.id))}>
        <div className="absolute left-3 top-3">
          <StatusPill status={survey.status} archived={isArchived} />
        </div>
        {/* Bulk selection has no place in the mock's card, but archiving and
            deleting in bulk are real features of this page — so the checkbox
            stays and keeps out of the way until it is wanted. */}
        <div
          className={cn(
            "absolute right-3 top-3 z-10 rounded-control bg-card/90 p-1 backdrop-blur-sm transition-opacity",
            selected ? "opacity-100" : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"
          )}
        >
          <Checkbox
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select ${survey.title}`}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-[18px] pt-[15px]">
        <div className="flex items-start gap-2">
          <Link
            href={`/admin/surveys/${survey.id}`}
            className="focus-ring type-heading min-w-0 flex-1 rounded-control"
          >
            {/* Stretches over the whole card, so anywhere that isn't the
                checkbox or the kebab navigates — same idiom the table rows
                used before. */}
            <span className="absolute inset-0" />
            {survey.title}
          </Link>
          <div className="relative z-10 -mr-1.5 -mt-1">
            <SurveyRowActions
              surveyId={survey.id}
              internalName={survey.title}
              slug={survey.slug}
              status={survey.status}
              archivedAt={survey.archivedAt}
              responseCount={survey.responseCount}
            />
          </div>
        </div>

        <div className="type-body-sm mt-1 text-muted-foreground">
          {survey.questionCount ?? EMPTY_VALUE} questions · created {created}
        </div>

        <div className="mt-[18px] flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            {/* Archivo, not a serif: DESIGN.md keeps the display face to the
                one page title per page. */}
            <span className="type-metric-value">{survey.responseCount}</span>
            <span className="type-metric-label">responses</span>
          </div>
          <Sparkbars days={survey.responsesByDay} />
        </div>

        <div className="mt-[18px] flex items-center gap-3">
          <div className="flex items-center gap-1">
            {survey.recentRespondents.map((name, i) => (
              <span
                key={i}
                aria-hidden
                className="flex h-[22px] w-[22px] items-center justify-center rounded-control bg-chip font-archivo text-micro font-bold text-muted-foreground"
              >
                {initialsOf(name)}
              </span>
            ))}
          </div>
          <span className="type-body-sm text-faint" suppressHydrationWarning>
            {survey.lastResponseAt ? formatRelativeTime(survey.lastResponseAt) : "No responses yet"}
          </span>
          <span className="type-body-sm ml-auto inline-flex items-center gap-1 font-semibold">
            Open
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden className="transition-transform duration-150 group-hover:translate-x-[3px]">
              <path d="M7.5 4.5l6 5.5-6 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
