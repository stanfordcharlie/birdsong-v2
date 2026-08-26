import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { LiveBoard, type LiveSurvey } from "./LiveBoard";

// Who is in an interview right now, read entirely from Supabase Realtime
// Presence in the browser (see lib/presence/survey-presence.ts). Nothing on
// this page is persisted or queryable after the fact: the only database read
// here is the list of surveys to watch, which is also what scopes the page,
// since a channel is only joined for a survey this owner actually has.
export default async function LivePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Live and unarchived, the same definition the sidebar's "Listening" count
  // uses. A draft survey has no public link to be answered through, and an
  // archived one refuses respondents outright, so neither can produce a row.
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, slug, num_questions")
    .eq("user_id", user?.id ?? "")
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
    <div className="admin-container-wide flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <span className="type-label">Live</span>
        <h1 className="type-page-title">Happening right now</h1>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {!error && <LiveBoard surveys={liveSurveys} />}
    </div>
  );
}
