import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { can, getActiveOrg } from "@/lib/org";
import { excludeDeletedResponses } from "@/lib/responses/visibility";
import { SettingRow, SettingsSection } from "../SettingsSection";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SampleDataCard } from "./SampleDataCard";

export default async function AccountSettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const org = await getActiveOrg();
  const canCreateStudy = can(org?.role, "study:create");

  const { data: sampleSurvey } =
    org && canCreateStudy
      ? await supabase
          .from("surveys")
          .select("id, title")
          .eq("org_id", org.orgId)
          .eq("is_sample", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

  const { count: sampleResponseCount } = sampleSurvey
    ? await excludeDeletedResponses(
        supabase
          .from("responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", sampleSurvey.id)
          .eq("is_test", true)
      )
    : { count: null };

  return (
    <SettingsSection title="Account" description="How you sign in to this workspace.">
      <div className="flex flex-col">
        <SettingRow
          title="Email"
          description="The address you sign in with. Notifications about leads go here too."
        >
          <ChangeEmailForm email={user?.email ?? null} />
        </SettingRow>

        <SettingRow
          title="Password"
          description="At least 10 characters. You'll stay signed in on this device."
        >
          <ChangePasswordForm />
        </SettingRow>

        {/* Not an account setting in the strict sense, but it lived on the
            old Settings page and has nowhere better to go. */}
        {canCreateStudy && (
          <SettingRow
            title="Sample data"
            description="One demo study with eight test responses, for exploring the dashboard. Test responses never count as leads or send email."
          >
            <SampleDataCard
              sample={
                sampleSurvey
                  ? { title: sampleSurvey.title, responseCount: sampleResponseCount ?? 0 }
                  : null
              }
            />
          </SettingRow>
        )}
      </div>
    </SettingsSection>
  );
}
