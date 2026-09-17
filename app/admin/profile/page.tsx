import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, requireActiveOrg } from "@/lib/org";
import { ProfileGate } from "./ProfileGate";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }
  const { orgId, role } = await requireActiveOrg();
  const readOnly = !can(role, "profile:edit");

  // One company profile per organization, read by org rather than by the
  // signed-in user so every member sees the same row.
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!profile && !readOnly) {
    // user_id records who created the row; org_id is what scopes it. RLS
    // only lets owners/admins insert, and a member never tries.
    const { data: created, error } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, org_id: orgId })
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
      orgId={orgId}
      readOnly={readOnly}
      hasExistingData={hasExistingData}
      initialValues={{
        companyName: profile?.company_name ?? "",
        industry: profile?.industry ?? "",
        website: profile?.website ?? "",
        teamSize: profile?.team_size ?? "",
        logoUrl: profile?.logo_url ?? null,
        whatWeSell: profile?.what_we_sell ?? "",
        targetIcp: profile?.target_icp ?? "",
        valueProp: profile?.value_prop ?? "",
        brandVoice: profile?.tone ?? "",
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
