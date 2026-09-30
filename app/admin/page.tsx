import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { excludeArchivedStudies } from "@/lib/lead-queue";
import { excludeDeletedResponses } from "@/lib/responses/visibility";
import { WORTH_A_CALL_SCORE_MIN } from "@/lib/leads";
import { formatRelativeTime } from "@/lib/format";
import { interviewLengthPreset } from "@/lib/studies/interview-length";
import { userFirstName } from "@/lib/user-name";
import { Button, PageShell, PageTopBar } from "@/components/admin/ui";
import { TimeOfDayWord } from "./HomeClock";
import { HomeLauncher } from "./HomeLauncher";
import { HomeLive, type HomeLiveStudy } from "./HomeLive";
import { NeedsYouCard, type NeedsYouItem } from "./HomeSections";
import { WorthACallCard, type WorthACallData } from "./HomeWorthACall";

// Home shows three things: what is worth a call, what needs you, and what is
// running now. This file is the data layer and the composition; the cards
// are HomeWorthACall.tsx, HomeSections.tsx and HomeLive.tsx.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Cards enter in reading order, 80ms apart.
const STAGGER_MS = 80;

export default async function AdminHomePage() {
  const supabase = await createClient();
  const [{ orgId, role }, user] = await Promise.all([requireActiveOrg(), getCurrentUser()]);
  const canCreateStudy = can(role, "study:create");
  const newStudyHref = canCreateStudy ? "/admin/projects/new" : "/admin/projects";

  // Four parallel reads, the same four tables as before. surveys and
  // survey_reports carry an explicit org_id filter because both have a
  // public-read policy, so RLS alone does not narrow them to this org.
  // responses has no such policy: its org-member read policy is the filter.
  const [{ data: surveysData }, { data: responsesData }, { data: reportRows }, { data: profile }] =
    await Promise.all([
      supabase
        .from("surveys")
        .select("id, title, status, interview_length, created_at")
        .eq("org_id", orgId)
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      // The lead queue's own set (lib/lead-queue.ts): completed or not,
      // archived studies excluded at the database, test responses left out
      // as the queue leaves them out. Every count below derives from it, so
      // Home, the sidebar and Leads agree.
      excludeDeletedResponses(
        excludeArchivedStudies(
          supabase
            .from("responses")
            .select(
              "id, survey_id, lead_score, lead_status, completed, completed_at, created_at, surveys!inner(archived_at)"
            )
            .eq("is_test", false)
        )
      ).order("created_at", { ascending: false }),
      supabase
        .from("survey_reports")
        .select("survey_id, published, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("contact_name").eq("org_id", orgId).maybeSingle(),
    ]);

  const surveys = surveysData ?? [];
  const surveyIds = new Set(surveys.map((s) => s.id));
  const completed = (responsesData ?? []).filter((r) => surveyIds.has(r.survey_id) && r.completed);

  // --- Worth a call ---------------------------------------------------------

  // "This week" is the last seven days, by when the interview finished.
  // completed_at is null on rows finished before the column existed; those
  // fall back to when they started.
  const weekAgo = Date.now() - WEEK_MS;
  const thisWeek = completed.filter(
    (r) => new Date(r.completed_at ?? r.created_at).getTime() >= weekAgo
  );
  // The Leads queue's Unworked tab: completed and still new, at any score
  // and any age. It is what the sidebar counts and where Triage lands.
  const unworked = completed.filter((r) => r.lead_status === "new");

  const worthACall: WorthACallData = {
    worth: thisWeek.filter((r) => (r.lead_score ?? 0) >= WORTH_A_CALL_SCORE_MIN).length,
    completed: thisWeek.length,
    contacted: thisWeek.filter((r) => r.lead_status === "contacted").length,
    meeting: thisWeek.filter((r) => r.lead_status === "meeting_booked").length,
    unworked: unworked.length,
  };

  // --- Needs you ------------------------------------------------------------

  // Only rows with a source. A failed HubSpot push is logged and returned to
  // the caller (lib/hubspot-sync.ts) but stored nowhere, so it has no row.
  const needsYou: NeedsYouItem[] = [];

  if (unworked.length > 0) {
    const oldest = unworked.reduce((a, b) => (a.created_at < b.created_at ? a : b));
    needsYou.push({
      id: "unworked",
      tone: "new",
      label: (
        <>
          <span className="font-mono font-medium">{unworked.length}</span>{" "}
          {unworked.length === 1 ? "lead" : "leads"} unworked, oldest{" "}
          <span className="font-mono font-medium [word-spacing:-0.3em]">
            {formatRelativeTime(oldest.created_at)}
          </span>
        </>
      ),
      action: "Triage",
      href: "/admin/leads?tab=unworked",
    });
  }

  // A study whose latest report has been generated and not published.
  const latestReportBySurvey = new Map<string, { published: boolean | null }>();
  for (const row of reportRows ?? []) {
    if (!latestReportBySurvey.has(row.survey_id)) latestReportBySurvey.set(row.survey_id, row);
  }
  const unpublished = can(role, "report:publish")
    ? surveys.filter((s) => latestReportBySurvey.get(s.id)?.published === false)
    : [];
  if (unpublished.length > 0) {
    needsYou.push({
      id: "reports",
      tone: "muted",
      label:
        unpublished.length === 1 ? (
          "Report ready to publish"
        ) : (
          <>
            <span className="font-mono font-medium">{unpublished.length}</span> reports ready to publish
          </>
        ),
      action: "Open",
      href: unpublished.length === 1 ? `/admin/projects/${unpublished[0].id}?tab=report` : "/admin/projects",
    });
  }

  // --- Live now -------------------------------------------------------------

  const liveStudies: HomeLiveStudy[] = surveys
    .filter((s) => s.status === "live")
    .map((s) => ({
      id: s.id,
      title: s.title,
      topics: interviewLengthPreset(s.interview_length).topics,
    }));

  const firstName = userFirstName(user, profile?.contact_name);

  return (
    <PageShell>
      <PageTopBar
        crumbs={[{ label: "Home" }]}
        actions={
          <Button asChild>
            <Link href={newStudyHref}>New study</Link>
          </Button>
        }
      />

      {/* 40px / 48px around the content, of which the shell already supplies
          28px / 32px. Capped at 1080px: Home is the one page that does not
          use the full width. */}
      <div className="px-4 pt-3">
        <div className="flex max-w-[1080px] flex-col gap-7">
          <div className="ds-enter flex flex-col gap-[18px]">
            <h1 className="ds-h1 text-[32px]">
              Good <TimeOfDayWord />
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <HomeLauncher href={newStudyHref} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <WorthACallCard data={worthACall} enterDelayMs={STAGGER_MS} />
            <NeedsYouCard items={needsYou} enterDelayMs={STAGGER_MS * 2} />
          </div>

          <HomeLive studies={liveStudies} enterDelayMs={STAGGER_MS * 3} />
        </div>
      </div>
    </PageShell>
  );
}
