import { createClient } from "@/lib/supabase/client";
import { slugify, randomSlugSuffix } from "@/lib/studies/slugify";
import type { StudyPayload } from "@/lib/study-brief/mapToStudy";

/**
 * Inserts the study, the way the form wizard does.
 *
 * There is no server action for this in the app: createSurvey in
 * components/NewStudyWizard.tsx writes from the browser client, under the
 * surveys insert policy, and this is that write with the same payload keys,
 * the same random slug suffix and the same retry on a slug collision.
 *
 * The one difference is `status`. The wizard leaves it to the column default,
 * which is live; a study made from a conversation starts as a draft, so
 * nothing is reachable by a respondent until the admin has looked at it.
 */
export async function createStudy({
  orgId,
  payload,
  slug,
}: {
  orgId: string;
  payload: StudyPayload;
  /** The slug as typed, or the title it is derived from. */
  slug: string;
}): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const baseSlug = slugify(slug);
  if (!baseSlug) throw new Error("The title needs at least one letter or number to make a link.");

  // Every new study's public slug ends in a random suffix so slugs can't be
  // enumerated across sponsors. The surveys_slug_key constraint is still the
  // backstop: on the off-chance 23505 fires, retry with a fresh suffix.
  let candidateSlug = `${baseSlug}-${randomSlugSuffix()}`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const { data, error } = await supabase
      .from("surveys")
      // user_id records who created the study; org_id is what scopes it, and
      // the insert policy rejects a row whose org the caller cannot write to.
      .insert({ ...payload, slug: candidateSlug, status: "draft", user_id: user.id, org_id: orgId })
      .select("id")
      .single();

    if (!error) return data.id;
    if (error.code !== "23505") throw error;
    candidateSlug = `${baseSlug}-${randomSlugSuffix()}`;
  }

  throw new Error("Couldn't find an available link for this title. Edit the link and try again.");
}
