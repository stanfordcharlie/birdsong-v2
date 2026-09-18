import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { excludeArchivedStudies } from "@/lib/lead-queue";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { userFirstName } from "@/lib/user-name";
import { PageHeader, PageShell } from "@/components/admin/ui";
import { GlobalSearch } from "@/components/admin/GlobalSearch";
import { TimeOfDayWord } from "./HomeClock";
import { HomeComposer } from "./HomeLauncher";
import {
  AttentionList,
  HeroEmpty,
  HeroStudyCard,
  LaunchChecklist,
  ProfileSection,
  type AttentionItem,
  type ChecklistItem,
  type HeroStudy,
  type ProfileCompletion,
  type TranscriptPreview,
  type TranscriptTurn,
} from "./HomeSections";

// This file is the data layer and the page composition; HomeSections.tsx
// holds the markup, HomeLauncher.tsx the composer, GlobalSearch the header
// search field.
//
// Data available today and used here: studies, responses (with their lead
// score, workflow status and assignment), report drafts, the company profile
// fields. Not available, so not rendered: invited counts, study close dates,
// bounced invites. The launch checklist derives its state from the same data
// rather than persisting anything.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// How many turns of the latest conversation the hero card previews.
const PREVIEW_TURNS = 4;

// The report generator needs three transcripts before it will run
// (app/api/surveys/[id]/report/route.ts).
const REPORT_INTERVIEW_MINIMUM = 3;

// The company profile fields the setup flow collects, in the order it asks
// for them. Completion is the share of these that are filled in.
const PROFILE_FIELDS = [
  { key: "company_name", label: "your company name" },
  { key: "what_we_sell", label: "what you sell" },
  { key: "target_icp", label: "who you sell to" },
  { key: "value_prop", label: "your value proposition" },
] as const;

function displayName(name: string | null): string {
  return name?.trim() || "Anonymous";
}

function listNames(names: string[], max = 3): string {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.join(", ");
}

function parseTurns(messages: unknown): TranscriptTurn[] {
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((m) => {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role !== "assistant" && role !== "user") || typeof content !== "string") return [];
    return [{ role, content }];
  });
}

export default async function AdminHomePage() {
  const supabase = await createClient();
  const [{ orgId, role }, user] = await Promise.all([requireActiveOrg(), getCurrentUser()]);
  const canCreateStudy = can(role, "study:create");
  const newStudyHref = canCreateStudy ? "/admin/projects/new" : "/admin/projects";

  // Four parallel queries. surveys and survey_reports carry an explicit
  // org_id filter because both tables have a public-read policy, so RLS
  // alone does not narrow them to this org. responses has no such policy:
  // its org-member read policy is the whole filter.
  const [{ data: surveysData }, { data: responsesData }, { data: reportRows }, { data: profile }] =
    await Promise.all([
      supabase
        .from("surveys")
        .select("id, slug, title, status, created_at")
        .eq("org_id", orgId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      // Archived studies are excluded at the database (lib/lead-queue.ts),
      // the same rule the lead queue applies, so counts here and there agree.
      excludeArchivedStudies(
        supabase
          .from("responses")
          .select(
            "id, survey_id, respondent_name, lead_score, status, assigned_to, completed, created_at, surveys!inner(archived_at)"
          )
          .eq("is_test", false)
      ).order("created_at", { ascending: false }),
      supabase.from("survey_reports").select("survey_id").eq("org_id", orgId),
      supabase
        .from("profiles")
        .select("company_name, what_we_sell, target_icp, value_prop, contact_name")
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);

  const surveys = surveysData ?? [];
  const surveyIds = new Set(surveys.map((s) => s.id));
  const responses = (responsesData ?? []).filter((r) => surveyIds.has(r.survey_id));
  const completed = responses.filter((r) => r.completed);

  const liveSurveys = surveys.filter((s) => s.status === "live");
  const draftSurveys = surveys.filter((s) => s.status !== "live");

  // --- The most active study ---------------------------------------------

  const weekAgo = Date.now() - WEEK_MS;
  const startedBySurvey = new Map<string, number>();
  const startedThisWeekBySurvey = new Map<string, number>();
  const completedBySurvey = new Map<string, number>();
  for (const r of responses) {
    startedBySurvey.set(r.survey_id, (startedBySurvey.get(r.survey_id) ?? 0) + 1);
    if (new Date(r.created_at).getTime() >= weekAgo) {
      startedThisWeekBySurvey.set(r.survey_id, (startedThisWeekBySurvey.get(r.survey_id) ?? 0) + 1);
    }
    if (r.completed) completedBySurvey.set(r.survey_id, (completedBySurvey.get(r.survey_id) ?? 0) + 1);
  }

  // Most conversations this week, then most ever, then newest. Live only: a
  // draft has no conversations to be active with.
  const heroSurvey = [...liveSurveys].sort(
    (a, b) =>
      (startedThisWeekBySurvey.get(b.id) ?? 0) - (startedThisWeekBySurvey.get(a.id) ?? 0) ||
      (startedBySurvey.get(b.id) ?? 0) - (startedBySurvey.get(a.id) ?? 0) ||
      b.created_at.localeCompare(a.created_at)
  )[0];

  // The one dependent query: the latest conversation on the hero study, with
  // its transcript. `messages` is a full transcript per row, so it is fetched
  // for exactly one row rather than selected above.
  let preview: TranscriptPreview | null = null;
  if (heroSurvey && (startedBySurvey.get(heroSurvey.id) ?? 0) > 0) {
    const { data: latest } = await supabase
      .from("responses")
      .select("id, respondent_name, completed, created_at, messages")
      .eq("survey_id", heroSurvey.id)
      .eq("is_test", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      preview = {
        responseId: latest.id,
        respondentName: displayName(latest.respondent_name),
        completed: latest.completed,
        createdAt: latest.created_at,
        turns: parseTurns(latest.messages).slice(-PREVIEW_TURNS),
      };
    }
  }

  const isWaiting = (r: (typeof responses)[number]) =>
    r.completed && (r.lead_score ?? 0) >= WORTH_A_CALL_SCORE_MIN && (r.status ?? "new") === "new";

  const hero: HeroStudy | null = heroSurvey
    ? {
        id: heroSurvey.id,
        slug: heroSurvey.slug,
        title: heroSurvey.title,
        startedCount: startedBySurvey.get(heroSurvey.id) ?? 0,
        completedCount: completedBySurvey.get(heroSurvey.id) ?? 0,
        waitingCount: responses.filter((r) => r.survey_id === heroSurvey.id && isWaiting(r)).length,
        assignedCount: responses.filter((r) => r.survey_id === heroSurvey.id && r.assigned_to !== null).length,
        preview,
      }
    : null;

  // --- Needs your attention -----------------------------------------------

  const waiting = responses.filter(isWaiting);
  const reportedSurveyIds = new Set((reportRows ?? []).map((r) => r.survey_id));
  const reportReady = surveys.filter(
    (s) => !reportedSurveyIds.has(s.id) && (completedBySurvey.get(s.id) ?? 0) >= REPORT_INTERVIEW_MINIMUM
  );
  const attention: AttentionItem[] = [];
  if (waiting.length > 0) {
    attention.push({
      id: "waiting",
      title: `${waiting.length} ${waiting.length === 1 ? "lead is" : "leads are"} waiting to hear from you`,
      detail: listNames(waiting.map((r) => displayName(r.respondent_name))),
      href: "/admin/leads?status=new",
    });
  }
  if (reportReady.length > 0) {
    attention.push({
      id: "reports",
      title: `${reportReady.length} report ${reportReady.length === 1 ? "draft is" : "drafts are"} ready`,
      detail: listNames(reportReady.map((s) => s.title)),
      href: reportReady.length === 1 ? `/admin/projects/${reportReady[0].id}` : "/admin/projects",
    });
  }
  // Drafts only count as attention once something else is live: with
  // nothing live at all, the hero card already says so.
  if (liveSurveys.length > 0 && draftSurveys.length > 0) {
    attention.push({
      id: "drafts",
      title: `${draftSurveys.length} ${draftSurveys.length === 1 ? "draft is" : "drafts are"} not live yet`,
      detail: listNames(draftSurveys.map((s) => s.title)),
      href: "/admin/projects",
    });
  }

  // --- Company profile ----------------------------------------------------

  const emptyFields = PROFILE_FIELDS.filter((f) => !profile?.[f.key]?.trim());
  const completion: ProfileCompletion = {
    filled: PROFILE_FIELDS.length - emptyFields.length,
    total: PROFILE_FIELDS.length,
    next: emptyFields[0]?.label ?? null,
  };

  // --- Before you launch --------------------------------------------------

  const checklist: ChecklistItem[] = [
    {
      id: "profile",
      label: "Complete your company profile",
      done: emptyFields.length === 0,
      href: "/admin/profile",
      action: "Open profile",
    },
    {
      id: "create",
      label: "Create your first study",
      done: surveys.length > 0,
      href: newStudyHref,
      action: "New study",
    },
    {
      id: "launch",
      label: "Launch a study",
      done: liveSurveys.length > 0,
      href: "/admin/projects",
      action: "Open studies",
    },
    {
      id: "respond",
      label: "Hear from your first respondent",
      done: completed.length > 0,
      href: heroSurvey ? `/admin/projects/${heroSurvey.id}` : "/admin/projects",
      action: "Share the link",
    },
  ];

  // --- Composition --------------------------------------------------------

  const firstName = userFirstName(user, profile?.contact_name);
  const checklistDone = checklist.every((item) => item.done);

  // Home fits the viewport on a desktop rather than scrolling: the page column
  // is exactly the height left inside AdminShell's padding, the hero row takes
  // what remains after the header and composer, and the transcript panel
  // clips under a fade rather than pushing the page taller. Below `lg` the
  // columns stack and the page scrolls as normal.
  return (
    <PageShell className="min-h-[calc(100vh-2*var(--ds-container-pad-y))] lg:h-[calc(100vh-2*var(--ds-container-pad-y))]">
      {/* relative z-10: bs-rise leaves the header with a transform, so it
          is its own stacking context and the search popover inside it would
          otherwise paint under the composer and the rail. */}
      <PageHeader
        className="bs-rise-1 relative z-10 shrink-0"
        title={
          <>
            Good <TimeOfDayWord />
            {firstName ? `, ${firstName}` : ""}
          </>
        }
        actions={<GlobalSearch className="hidden w-72 flex-none sm:block" />}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-8">
        <div className="bs-rise-2 shrink-0">
          <HomeComposer href={newStudyHref} />
        </div>

        {/* The one row is minmax(0, 1fr), not auto: an auto row sizes to its
            content, so the hero's max-h-full would resolve against the
            content instead of the space that is actually left. */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)] lg:items-start">
          {/* max-h-full is what caps the hero card at the row's height; the
              card itself shrinks its transcript panel to fit. */}
          <div className="bs-rise-3 flex min-h-0 max-h-full flex-col lg:col-span-2">
            {hero ? (
              <HeroStudyCard study={hero} />
            ) : (
              <HeroEmpty draftCount={draftSurveys.length} newStudyHref={newStudyHref} />
            )}
          </div>
          <div className="bs-rise-4 flex flex-col gap-8">
            <AttentionList items={attention} />
            <ProfileSection completion={completion} />
          </div>
        </div>

        {/* Rendered only while a step is open: an empty wrapper would still
            claim a gap step at the bottom of the page. */}
        {!checklistDone && (
          <div className="bs-rise-5 shrink-0">
            <LaunchChecklist items={checklist} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
