import { createClient } from "@/lib/supabase/server";
import type { QuestionGuideProfileContext } from "@/lib/surveys/question-guide";

/**
 * The organization's Company Profile, read server-side.
 *
 * Read for two reasons that pull in opposite directions: the brief chat uses
 * it to avoid re-asking for anything already on file, and the generator uses
 * it as the list of things a question must never name.
 */
export async function loadProfileContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
): Promise<QuestionGuideProfileContext | null> {
  const { data } = await supabase
    .from("profiles")
    .select("what_we_sell, target_icp, value_prop")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!data) return null;
  return {
    whatWeSell: data.what_we_sell,
    targetIcp: data.target_icp,
    valueProp: data.value_prop,
  };
}
