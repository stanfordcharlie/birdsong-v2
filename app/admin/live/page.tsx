import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrg } from "@/lib/org";
import { PageHeader, PageShell } from "@/components/admin/ui";
import { LiveBoard, type LiveSurvey } from "./LiveBoard";

// Who is in an interview right now, read entirely from Supabase Realtime
// Presence in the browser (see lib/presence/survey-presence.ts). Nothing on
// this page is persisted or queryable after the fact: the only database read
// here is the list of surveys to watch, which is also what scopes the page,
// since a channel is only joined for a survey this owner actually has.
export default async function LivePage() {
  const supabase = await createClient();
  const { orgId } = await requireActiveOrg();

  // Live and unarchived. A draft survey has no public link to be answered
  // through, and an archived one refuses respondents outright, so neither
  // can produce a row. Explicit org filter: surveys_public_read means RLS
  // alone would return every organization's surveys.
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, slug, num_questions")
    .eq("org_id", orgId)
    .eq("status", "live")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const liveSurveys: LiveSurvey[] = (surveys ?? []).map((survey) => ({
    id: survey.id,
    title: survey.title,
    slug: survey.slug,
    questionTarget: survey.num_questions,
  }));

  return (
    <PageShell>
      {/* Reached from Leads, not the nav, so the eyebrow names that parent. */}
      <PageHeader
        eyebrow={
          <Link href="/admin/leads" className="focus-ring rounded-control hover:text-card-foreground">
            Leads
          </Link>
        }
        title="Live"
      />

      {error && <p className="type-body text-destructive">{error.message}</p>}

      {!error && <LiveBoard surveys={liveSurveys} />}
    </PageShell>
  );
}
