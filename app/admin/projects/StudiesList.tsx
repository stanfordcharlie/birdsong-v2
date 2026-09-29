"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  FilterTabs,
  RelativeTime,
  SearchInput,
  Waveform,
} from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import { EMPTY_VALUE, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StudyRowActions } from "./StudyRowActions";

// Built from design/mockups/Projects.html: live and draft studies as cards
// with a flat cover carrying the study's waveform, archived studies as
// compact rows, and a dashed card that starts a new study.

export type StudyListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  /** The length preset, as "Standard · about 10 min". */
  lengthSummary: string;
  /** Interviews started, test runs left out. */
  responseCount: number;
  completedCount: number;
  /** Completed and scored at or above the worth-a-call line. */
  qualifiedCount: number;
  lastResponseAt: string | null;
  /** Prospects on the study's roster. Zero when it has none. */
  prospectCount: number;
  prospectsStarted: number;
  prospectsCompleted: number;
  prospectsPending: number;
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

// More archived studies than this and they move from the grid's last column
// to their own rows beneath it.
const ARCHIVED_IN_COLUMN_MAX = 2;

type Status = "live" | "draft" | "archived";

function statusOf(survey: StudyListItem): Status {
  if (survey.archivedAt !== null) return "archived";
  return survey.status === "live" ? "live" : "draft";
}

// Shared by the tab counts and the grid so a tab can never promise a number
// the grid then contradicts.
function matchesStatus(survey: StudyListItem, filter: StatusFilter): boolean {
  return filter === "all" || statusOf(survey) === filter;
}

const MONO = "font-mono tabular-nums";

function Actions({ survey }: { survey: StudyListItem }) {
  return (
    <StudyRowActions
      surveyId={survey.id}
      internalName={survey.title}
      slug={survey.slug}
      status={survey.status}
      archivedAt={survey.archivedAt}
      responseCount={survey.responseCount}
    />
  );
}

function CardStat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className={cn("text-[12px]", text.muted2)}>{label}</dt>
      <dd className={cn(MONO, "text-[16px] font-medium", accent && text.accent)}>{value}</dd>
    </div>
  );
}

// Completed, then in progress, over everyone on the roster.
function ProspectBar({ survey }: { survey: StudyListItem }) {
  const share = (count: number) => `${(count / survey.prospectCount) * 100}%`;
  return (
    <div
      role="img"
      aria-label={`${survey.prospectsCompleted} of ${survey.prospectCount} prospects completed, ${survey.prospectsStarted} in progress`}
      className={cn("flex h-[6px] overflow-hidden rounded-full", bg.track)}
    >
      <span className={bg.accent} style={{ width: share(survey.prospectsCompleted) }} />
      <span className={bg.accentSoft} style={{ width: share(survey.prospectsStarted) }} />
    </div>
  );
}

function StudyCard({ survey, canManage }: { survey: StudyListItem; canManage: boolean }) {
  const live = statusOf(survey) === "live";
  const completion = survey.responseCount > 0 ? survey.completedCount / survey.responseCount : null;

  return (
    <li className="relative min-w-0">
      <Link
        href={`/admin/projects/${survey.id}`}
        className={cn(
          "focus-ring flex h-full flex-col overflow-hidden border transition-colors hover:border-[color:hsl(var(--ds-border-dashed))]",
          radius.card,
          border.base,
          bg.base
        )}
      >
        <div className={cn("flex h-[112px] items-end px-5 pb-5", live ? bg.accentWeak : bg.track)}>
          <Waveform
            seed={survey.id}
            bars={36}
            barWidth={5}
            height={46}
            align="end"
            tone={live ? "light" : "muted"}
            className="max-w-full overflow-hidden"
          />
        </div>

        <div className="flex flex-1 flex-col gap-[14px] px-5 pb-5 pt-[18px]">
          <div className="flex items-start justify-between gap-3">
            <h2 className="ds-card-title min-w-0">{survey.title}</h2>
            <Badge state={live ? "live" : "draft"} className="shrink-0" />
          </div>
          <p className={cn("text-[12px]", text.muted2)}>
            {survey.lengthSummary} · created {formatDate(survey.createdAt)}
          </p>

          {live && (
            <dl className="grid grid-cols-3 gap-3">
              <CardStat label="Responses" value={survey.responseCount} />
              <CardStat
                label="Completion"
                value={completion === null ? EMPTY_VALUE : formatPercent(completion)}
              />
              <CardStat label="Worth a call" value={survey.qualifiedCount} accent />
            </dl>
          )}

          {live && survey.prospectCount > 0 && <ProspectBar survey={survey} />}

          <p className={cn("mt-auto text-[12px]", text.muted2)}>
            {survey.lastResponseAt ? (
              <>
                Last response <RelativeTime date={survey.lastResponseAt} />
              </>
            ) : live ? (
              "No responses yet"
            ) : (
              "Not sent yet"
            )}
            {survey.prospectsPending > 0 && (
              <>
                {" · "}
                <span className={MONO}>{survey.prospectsPending}</span>{" "}
                {survey.prospectsPending === 1 ? "prospect" : "prospects"} pending
              </>
            )}
          </p>
        </div>
      </Link>
      {canManage && (
        <div className="absolute right-3 top-3 z-10">
          <Actions survey={survey} />
        </div>
      )}
    </li>
  );
}

function ArchivedRow({ survey, canManage }: { survey: StudyListItem; canManage: boolean }) {
  return (
    <li className="relative min-w-0">
      <Link
        href={`/admin/projects/${survey.id}`}
        className={cn(
          "focus-ring flex h-[64px] items-center gap-[14px] border px-[18px] transition-colors hover:border-[color:hsl(var(--ds-border-dashed))]",
          canManage && "pr-[52px]",
          radius.card,
          border.base,
          bg.base
        )}
      >
        <span
          aria-hidden
          className={cn("flex h-[40px] w-[40px] shrink-0 items-end justify-center pb-[10px]", radius.control, bg.track)}
        >
          <Waveform seed={survey.id} bars={4} height={16} align="end" tone="muted" className="gap-[2px]" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] font-bold">{survey.title}</span>
          <span className={cn("truncate text-[12px]", text.muted2)}>
            Archived · <span className={MONO}>{survey.responseCount}</span>{" "}
            {survey.responseCount === 1 ? "response" : "responses"} ·{" "}
            <span className={MONO}>{survey.qualifiedCount}</span> worth a call
          </span>
        </span>
      </Link>
      {canManage && (
        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
          <Actions survey={survey} />
        </div>
      )}
    </li>
  );
}

function NewStudyCard({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "focus-ring flex min-h-[64px] items-center justify-center gap-2 border border-dashed px-[18px] py-4 text-[14px] font-bold transition-colors hover:bg-[color:hsl(var(--ds-bg-sidebar))]",
        radius.card,
        border.dashed,
        text.muted,
        className
      )}
    >
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M8 3v10M3 8h10" />
      </svg>
      New study
    </Link>
  );
}

const GRID = "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

export function StudiesList({
  surveys,
  initialStatusFilter = "all",
  canManage = true,
  newStudyHref,
}: {
  surveys: StudyListItem[];
  // Deep-link, e.g. ?status=live.
  initialStatusFilter?: StatusFilter;
  // From can(role, "study:edit"/"study:delete") on the server. False hides
  // the per-study menu: a member reads the list and opens studies.
  canManage?: boolean;
  /** Where New study goes; null hides it. */
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

  const cards = filtered.filter((survey) => statusOf(survey) !== "archived");
  const archived = filtered.filter((survey) => statusOf(survey) === "archived");
  const searching = query.trim() !== "";
  const showNewStudy = newStudyHref !== null && statusFilter !== "archived" && !searching;
  // Beside the cards while there are few enough to share a column with the
  // New study card; beneath the grid otherwise.
  const archivedInColumn = cards.length > 0 && archived.length > 0 && archived.length <= ARCHIVED_IN_COLUMN_MAX;

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className={cn("ds-h1", text.ink)}>Projects</h1>
        {surveys.length > 0 && (
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search studies"
            label="Search studies by name"
            className="h-[36px] sm:w-[280px] sm:flex-none"
          />
        )}
      </div>

      {surveys.length === 0 ? (
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
      ) : (
        <>
          <FilterTabs
            label="Filter studies by status"
            tabs={FILTERS.map((f) => ({ ...f, count: statusCounts[f.value] }))}
            value={statusFilter}
            onChange={setStatusFilter}
            className="self-start"
          />

          {filtered.length === 0 && <EmptyState className="py-2" title="No studies match." />}

          {(cards.length > 0 || showNewStudy) && (
            <ul className={GRID}>
              {cards.map((survey) => (
                <StudyCard key={survey.id} survey={survey} canManage={canManage} />
              ))}
              {archivedInColumn ? (
                <li className="min-w-0">
                  <ul className="flex h-full flex-col gap-3">
                    {archived.map((survey) => (
                      <ArchivedRow key={survey.id} survey={survey} canManage={canManage} />
                    ))}
                    {showNewStudy && newStudyHref && (
                      <li className="flex min-h-[64px] flex-1">
                        <NewStudyCard href={newStudyHref} className="flex-1" />
                      </li>
                    )}
                  </ul>
                </li>
              ) : (
                showNewStudy &&
                newStudyHref && (
                  <li className="flex min-w-0">
                    <NewStudyCard href={newStudyHref} className="flex-1" />
                  </li>
                )
              )}
            </ul>
          )}

          {!archivedInColumn && archived.length > 0 && (
            <ul className={GRID}>
              {archived.map((survey) => (
                <ArchivedRow key={survey.id} survey={survey} canManage={canManage} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
