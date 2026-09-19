import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CollapsibleSection,
  EmptyState,
  RelativeTime,
  StatRow,
  StatusDot,
} from "@/components/admin/ui";
import { formatPercent } from "@/lib/format";
import { stripBold } from "@/lib/interview/split-question";
import { cn } from "@/lib/utils";

// The Home page's presentational layer. Every shape here is a primitive from
// components/admin/ui composed in place; nothing is forked. The page reads,
// top to bottom: greeting, composer, the most active study beside what needs
// attention, the launch checklist.

export type TranscriptTurn = { role: "assistant" | "user"; content: string };

export type TranscriptPreview = {
  responseId: string;
  respondentName: string;
  completed: boolean;
  createdAt: string;
  turns: TranscriptTurn[];
};

export type HeroStudy = {
  id: string;
  slug: string;
  title: string;
  startedCount: number;
  completedCount: number;
  /** Scored 7 or higher and nobody has touched them. */
  waitingCount: number;
  /** Handed to a teammate through the lead queue. */
  assignedCount: number;
  preview: TranscriptPreview | null;
};

export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
};

export type ProfileCompletion = {
  filled: number;
  total: number;
  /** The first empty field, as a phrase: "your value proposition". */
  next: string | null;
};

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
  action: string;
};

function plural(count: number, noun: string, pluralNoun = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      className="mt-1 h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-card-foreground"
    >
      <path d="M6 3.5l4.5 4.5L6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A hairline-topped section with an eyebrow: the right column's shape,
// per DESIGN.md ("a hairline top rule and an eyebrow, not a Card").
function SideSection({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center gap-2">
        <h2 className="type-eyebrow">{label}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

// --- The most active study ---------------------------------------------------

function heroFacts(study: HeroStudy): string {
  const inProgress = study.startedCount - study.completedCount;
  const parts: string[] = [];
  parts.push(
    study.completedCount === 0
      ? "Nobody has finished a conversation yet"
      : `${plural(study.completedCount, "person", "people")} ${study.completedCount === 1 ? "has" : "have"} finished a conversation`
  );
  if (inProgress > 0) parts.push(`${inProgress} more ${inProgress === 1 ? "is" : "are"} mid-interview`);
  let sentence = parts.join(" and ") + ".";
  if (study.waitingCount > 0) {
    sentence += ` ${plural(study.waitingCount, "lead")} ${study.waitingCount === 1 ? "is" : "are"} worth a call and waiting on you.`;
  } else if (study.assignedCount > 0) {
    sentence += ` ${plural(study.assignedCount, "lead")} ${study.assignedCount === 1 ? "has" : "have"} been handed to a teammate.`;
  }
  return sentence;
}

// The respondent's screen, previewed. The panel carries --ds-surface (the
// canvas colour) and the bubbles split left for the interviewer and right
// for the respondent with one square corner each. That layout is the whole
// resemblance to the interview: the colours are the admin's.
function TranscriptPanel({ preview }: { preview: TranscriptPreview | null }) {
  const openTranscript = preview && (
    <Button asChild variant="ghost" size="sm" className="px-0">
      <Link href={preview.completed ? `/admin/responses/${preview.responseId}` : `/admin/live/${preview.responseId}`}>
        Open transcript
      </Link>
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-card bg-surface p-4">
      {/* The meta line wraps under the eyebrow when the panel is narrow
          rather than truncating: a bare ellipsis is not a value. */}
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="type-eyebrow whitespace-nowrap">Latest conversation</span>
        {preview && (
          <span className="type-meta whitespace-nowrap">
            {preview.respondentName} · <RelativeTime date={preview.createdAt} />
          </span>
        )}
      </div>
      {preview && preview.turns.length > 0 ? (
        // The list takes whatever height the card leaves it and clips. The
        // footer is sticky to the list's bottom edge, so when the turns run
        // past it they fade out under its top 32px instead of hard-cutting;
        // when they fit, it simply follows the last bubble.
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          {/* The clamp sits on an inner element with no padding of its own:
              a clamped box that also carries padding lets the cut-off line
              show through the padding as a half-rendered row. */}
          {preview.turns.map((turn, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-card border border-border bg-card px-3 py-2",
                turn.role === "assistant" ? "self-start rounded-tl-control" : "self-end rounded-tr-control"
              )}
            >
              <p className="type-body-sm line-clamp-3 break-words">{stripBold(turn.content)}</p>
            </div>
          ))}
          <div className="sticky bottom-0 mt-auto flex shrink-0 bg-gradient-to-t from-surface from-50% to-transparent pt-8">
            {openTranscript}
          </div>
        </div>
      ) : (
        <>
          <p className="type-body-sm text-muted-foreground">No one has started a conversation yet.</p>
          {openTranscript && <div className="mt-auto flex">{openTranscript}</div>}
        </>
      )}
    </div>
  );
}

export function HeroStudyCard({ study }: { study: HeroStudy }) {
  return (
    // The single grid row is minmax(min-content, 1fr) rather than auto so
    // the card can be shorter than its transcript when the page has room
    // (the panel clips) but never shorter than its own copy column.
    <Card className="grid min-h-0 gap-6 md:grid-cols-2 md:grid-rows-[minmax(min-content,1fr)]">
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex items-center gap-2">
          <StatusDot live pulse />
          <span className="type-eyebrow">Live now</span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="type-heading">{study.title}</h2>
          <p className="type-body text-muted-foreground">{heroFacts(study)}</p>
        </div>
        {/* Small size and a ghost second action: the copy column is 284px
            wide at 1280, and two default pills do not fit on one row there. */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link href={`/admin/projects/${study.id}`}>Read insights</Link>
          </Button>
          {/* ?test=1 is owner-verified server-side; the preview runs the
              real interview without counting as a response. */}
          <Button asChild variant="ghost" size="sm" className="px-0">
            <a href={`/study/${study.slug}?test=1`} target="_blank" rel="noreferrer">
              Preview as respondent
            </a>
          </Button>
        </div>
      </div>
      <TranscriptPanel preview={study.preview} />
    </Card>
  );
}

// No live study. One sentence and the one action that changes it.
export function HeroEmpty({
  draftCount,
  newStudyHref,
}: {
  draftCount: number;
  newStudyHref: string;
}) {
  return (
    <Card>
      <EmptyState
        className="py-2"
        title={
          draftCount > 0
            ? `No study is live. Launch one of your ${plural(draftCount, "draft")} and its conversations show up here.`
            : "No study is live. Start one and Birdsong runs the interviews."
        }
        action={
          <Button asChild>
            <Link href={draftCount > 0 ? "/admin/projects" : newStudyHref}>
              {draftCount > 0 ? "Open studies" : "New study"}
            </Link>
          </Button>
        }
      />
    </Card>
  );
}

// --- Needs your attention ----------------------------------------------------

export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <SideSection
      label="Needs your attention"
      badge={items.length > 0 ? <Badge size="sm">{items.length}</Badge> : undefined}
    >
      {items.length === 0 ? (
        <EmptyState className="py-1" title="Nothing needs you right now." />
      ) : (
        <ul className="-mx-2 flex flex-col">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="focus-ring group flex items-start gap-3 rounded-control px-2 py-3 transition-colors hover:bg-secondary"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="type-body font-medium">{item.title}</span>
                  <span className="type-body-sm text-muted-foreground">{item.detail}</span>
                </span>
                <ChevronIcon />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SideSection>
  );
}

// --- Company profile ---------------------------------------------------------

export function ProfileSection({ completion }: { completion: ProfileCompletion }) {
  const complete = completion.filled >= completion.total;
  return (
    <SideSection label="Company profile">
      <p className="type-body-sm text-muted-foreground">
        Birdsong writes better questions when it knows what you sell and who you sell to.
      </p>
      {complete ? (
        // A finished profile has no number worth a stat cell. One row, the
        // same shape as a finished checklist step, still linking to the profile.
        <Link
          href="/admin/profile"
          className="focus-ring -mx-2 flex items-center justify-between gap-3 rounded-control px-2 py-2 transition-colors hover:bg-secondary"
        >
          <span className="type-body">Profile complete</span>
          <Badge variant="accent" size="sm">
            Done
          </Badge>
        </Link>
      ) : (
        <StatRow
          stats={[
            {
              label: "Profile complete",
              value: formatPercent(completion.total > 0 ? completion.filled / completion.total : 0),
              delta: `Next: ${completion.next}`,
              href: "/admin/profile",
            },
          ]}
        />
      )}
    </SideSection>
  );
}

// --- Before you launch -------------------------------------------------------

// Derived from the data on the page rather than stored: each step is done
// exactly when the thing it asks for exists. Rendered only while something
// is still to do; a finished checklist has nothing to say.
export function LaunchChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return null;

  return (
    <Card padding="flush" className="px-6">
      <CollapsibleSection
        title="Before you launch"
        summary={`${done} of ${items.length} completed`}
        defaultOpen
      >
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 py-3">
              <span className={cn("type-body", item.done && "text-muted-foreground")}>{item.label}</span>
              {item.done ? (
                <Badge variant="accent" size="sm">
                  Done
                </Badge>
              ) : (
                <Button asChild variant="ghost" size="sm" className="px-0">
                  <Link href={item.href}>{item.action}</Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleSection>
    </Card>
  );
}
