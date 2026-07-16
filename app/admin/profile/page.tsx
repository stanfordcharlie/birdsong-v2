import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ProfileGate } from "./ProfileGate";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({ user_id: user.id })
      .select("*")
      .single();
    if (!error) {
      profile = created;
    }
  }

  // onboarding_completed_at (not "does any field have a value") is the
  // gate now: the redesigned setup flow autosaves every field as the
  // admin fills it in, so a profile can have a company name saved from a
  // half-finished session. Only an explicit "Finish setup" sets this.
  const hasExistingData = Boolean(profile?.onboarding_completed_at);

  return (
    <ProfileGate
      hasExistingData={hasExistingData}
      initialValues={{
        companyName: profile?.company_name ?? "",
        whatWeSell: profile?.what_we_sell ?? "",
        targetIcp: profile?.target_icp ?? "",
        valueProp: profile?.value_prop ?? "",
        logoUrl: profile?.logo_url ?? null,
      }}
      setupInitialData={{
        companyName: profile?.company_name ?? "",
        industry: profile?.industry ?? "",
        teamSize: profile?.team_size ?? "",
        website: profile?.website ?? "",
        linkedin: profile?.linkedin ?? "",
        description: profile?.what_we_sell ?? "",
        audience: profile?.target_icp ?? "",
        valueProp: profile?.value_prop ?? "",
        tone: profile?.tone ?? "",
        avoid: profile?.words_to_avoid ?? "",
        contactName: profile?.contact_name ?? "",
        contactEmail: profile?.contact_email ?? "",
      }}
    />
  );
}
