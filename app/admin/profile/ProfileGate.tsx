"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyProfileSetupFlow } from "./CompanyProfileSetupFlow";
import { ProfileEditChat } from "./ProfileEditChat";
import { ProfileForm, type ProfileFormValues } from "./ProfileForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { deleteCompanyLogo } from "@/lib/profile/logo";

export function ProfileGate({
  hasExistingData,
  initialValues,
  setupInitialData,
}: {
  hasExistingData: boolean;
  initialValues: ProfileFormValues;
  setupInitialData: Record<string, string>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [justFinishedSetup, setJustFinishedSetup] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  // ProfileForm only reads its initialValues once, at mount, since it owns
  // its own field state for direct typing. Bumping this key forces a
  // remount whenever the edit chat applies a change, or the setup flow
  // finishes, so the form picks up fresh values instead of stale ones.
  const [formKey, setFormKey] = useState(0);

  // The setup flow now saves every field itself (debounced, straight to
  // Supabase) rather than handing back one final payload, so this just
  // keeps the static-view form in sync whenever the server gives us fresh
  // data, e.g. after router.refresh() below.
  useEffect(() => {
    setValues(initialValues);
    setFormKey((prev) => prev + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  // Clears every profile field plus onboarding_completed_at so page.tsx's
  // hasExistingData check flips back to false on the next server render,
  // sending the admin through CompanyProfileSetupFlow again from scratch.
  async function handleReset() {
    const confirmed = window.confirm(
      "Reset your company profile? This clears everything you've entered, including the logo, and takes you back through setup. This can't be undone."
    );
    if (!confirmed) return;

    setResetError(null);
    setResetting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: null,
          what_we_sell: null,
          target_icp: null,
          value_prop: null,
          logo_url: null,
          industry: null,
          team_size: null,
          website: null,
          linkedin: null,
          tone: null,
          words_to_avoid: null,
          contact_name: null,
          contact_email: null,
          onboarding_completed_at: null,
        })
        .eq("user_id", user.id);
      if (error) throw error;

      if (values.logoUrl) await deleteCompanyLogo(values.logoUrl);

      router.refresh();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to reset profile");
      setResetting(false);
    }
  }

  function handleEditApplied(updated: ProfileFormValues) {
    // The AI edit chat only ever touches the text fields (see
    // lib/profile-onboarding/edit.ts's ExtractedProfile shape), so its
    // response has no opinion on the logo, so carry the current one forward
    // rather than letting it default away.
    setValues((prev) => ({ ...updated, logoUrl: prev?.logoUrl ?? null }));
    setFormKey((prev) => prev + 1);
  }

  if (!hasExistingData) {
    return (
      <CompanyProfileSetupFlow
        initialData={setupInitialData}
        onDone={() => {
          setJustFinishedSetup(true);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-card-foreground">Company Profile</h1>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {justFinishedSetup && (
            <p className="text-sm text-muted-foreground">Setup complete, saved. Anything to adjust?</p>
          )}
          <ProfileEditChat currentValues={values} onUpdate={handleEditApplied} />
          <ProfileForm key={formKey} initialValues={values} />
        </CardContent>
      </Card>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={resetting}
          className="text-muted-foreground hover:text-destructive"
        >
          {resetting ? "Resetting..." : "Reset company profile"}
        </Button>
        {resetError && <span className="text-xs text-destructive">{resetError}</span>}
      </div>
    </div>
  );
}
