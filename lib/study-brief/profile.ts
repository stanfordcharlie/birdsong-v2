import type { createClient } from "@/lib/supabase/server";

/**
 * What the conversation is told about the company before it asks anything,
 * so it never asks for something the profile already says.
 *
 * Read on the server, for the signed-in admin's own organization, through
 * the cookie client and its row policies. The browser never sends it.
 */
export type ConverseProfile = {
  companyName: string | null;
  whatWeSell: string | null;
  targetIcp: string | null;
  valueProp: string | null;
  doNotMention: string | null;
};

export async function loadConverseProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
): Promise<ConverseProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("company_name, what_we_sell, target_icp, value_prop, words_to_avoid")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!data) return null;
  return {
    companyName: data.company_name,
    whatWeSell: data.what_we_sell,
    targetIcp: data.target_icp,
    valueProp: data.value_prop,
    doNotMention: data.words_to_avoid,
  };
}
