import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-card-foreground">Company Profile</h1>
      <Card>
        <CardContent className="pt-6">
          <ProfileForm
            initialValues={{
              companyName: profile?.company_name ?? "",
              whatWeSell: profile?.what_we_sell ?? "",
              targetIcp: profile?.target_icp ?? "",
              valueProp: profile?.value_prop ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
