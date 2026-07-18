import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ActivityEvent =
  | { type: "new_responses"; count: number; surveyTitle: string; at: string }
  | { type: "qualified"; count: number; surveyTitle: string; at: string };

const LOOKBACK_DAYS = 14;
const MAX_EVENTS = 3;

type Bucket = { count: number; latest: string };

// Surfaces the admin's most recent positive activity across their surveys:
// response bursts and newly-qualified leads. There's no response-goal /
// milestone concept in the data model (no target field on surveys), so
// that's not represented here — only event types with a real backing
// column exist. "not_a_fit" responses are excluded; they aren't activity
// worth surfacing on the welcome screen.
export async function getRecentActivity(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActivityEvent[]> {
  const { data: surveys } = await supabase.from("surveys").select("id, title").eq("user_id", userId);
  const surveyIds = (surveys ?? []).map((s) => s.id);
  if (surveyIds.length === 0) return [];

  const titleById = new Map(surveys!.map((s) => [s.id, s.title]));

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: responses } = await supabase
    .from("responses")
    .select("survey_id, status, created_at")
    .in("survey_id", surveyIds)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const newBuckets = new Map<string, Bucket>();
  const qualifiedBuckets = new Map<string, Bucket>();

  for (const r of responses ?? []) {
    if (r.status === "not_a_fit") continue;
    const buckets = r.status === "qualified" ? qualifiedBuckets : newBuckets;
    const existing = buckets.get(r.survey_id);
    if (existing) {
      existing.count += 1;
      if (r.created_at > existing.latest) existing.latest = r.created_at;
    } else {
      buckets.set(r.survey_id, { count: 1, latest: r.created_at });
    }
  }

  const candidates: ActivityEvent[] = [];
  for (const [surveyId, bucket] of Array.from(newBuckets.entries())) {
    const surveyTitle = titleById.get(surveyId);
    if (surveyTitle) candidates.push({ type: "new_responses", count: bucket.count, surveyTitle, at: bucket.latest });
  }
  for (const [surveyId, bucket] of Array.from(qualifiedBuckets.entries())) {
    const surveyTitle = titleById.get(surveyId);
    if (surveyTitle) candidates.push({ type: "qualified", count: bucket.count, surveyTitle, at: bucket.latest });
  }

  candidates.sort((a, b) => (a.at < b.at ? 1 : -1));
  return candidates.slice(0, MAX_EVENTS);
}
