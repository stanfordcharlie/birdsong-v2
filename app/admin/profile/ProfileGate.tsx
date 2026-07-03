"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProfileOnboarding } from "./ProfileOnboarding";
import { ProfileForm, type ProfileFormValues } from "./ProfileForm";
import type { ResearchResult } from "@/lib/profile-onboarding/types";

export function ProfileGate({
  hasExistingData,
  initialValues,
}: {
  hasExistingData: boolean;
  initialValues: ProfileFormValues;
}) {
  const [values, setValues] = useState<ProfileFormValues | null>(
    hasExistingData ? initialValues : null
  );
  const [justOnboarded, setJustOnboarded] = useState(false);

  async function handleOnboardingComplete(
    completedValues: ProfileFormValues,
    research: ResearchResult | null
  ) {
    setValues(completedValues);
    setJustOnboarded(true);

    // The research itself already happened regardless of whether the admin
    // ends up editing/saving the summary fields below, so record it
    // immediately rather than gating it behind the separate "Save changes"
    // action on the form.
    if (research) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            enrichment_sources: research.sources,
            last_enriched_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      }
    }
  }

  if (!values) {
    return <ProfileOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {justOnboarded && (
        <p className="text-sm text-muted-foreground">
          Here&apos;s what we&apos;ve got, anything to adjust before saving?
        </p>
      )}
      <ProfileForm initialValues={values} />
    </div>
  );
}
