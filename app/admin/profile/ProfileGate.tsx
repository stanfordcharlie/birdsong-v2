"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProfileOnboarding } from "./ProfileOnboarding";
import { ProfileEditChat } from "./ProfileEditChat";
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
  const [autoSaveFailed, setAutoSaveFailed] = useState(false);
  // ProfileForm only reads its initialValues once, at mount, since it owns
  // its own field state for direct typing. Bumping this key forces a
  // remount whenever the edit chat applies a change, so the form picks up
  // the new values instead of showing stale ones underneath the chat.
  const [formKey, setFormKey] = useState(0);

  function handleEditApplied(updated: ProfileFormValues) {
    setValues(updated);
    setFormKey((prev) => prev + 1);
  }

  async function handleOnboardingComplete(
    completedValues: ProfileFormValues,
    research: ResearchResult | null
  ) {
    setValues(completedValues);
    setJustOnboarded(true);

    // Save immediately rather than leaving the extracted draft unsaved
    // until the admin explicitly clicks "Save changes" below — the
    // conversation already produced real data, so it shouldn't be lost if
    // they navigate away before touching the summary form. The research
    // metadata is folded into the same write since it also already
    // happened regardless of what the admin does with the summary.
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        company_name: completedValues.companyName || null,
        what_we_sell: completedValues.whatWeSell || null,
        target_icp: completedValues.targetIcp || null,
        value_prop: completedValues.valueProp || null,
        ...(research
          ? {
              enrichment_sources: research.sources,
              last_enriched_at: new Date().toISOString(),
            }
          : {}),
      })
      .eq("user_id", user.id);

    if (error) {
      console.error("[profile-onboarding] auto-save failed:", error);
      setAutoSaveFailed(true);
    }
  }

  if (!values) {
    return <ProfileOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {justOnboarded && !autoSaveFailed && (
        <p className="text-sm text-muted-foreground">
          Here&apos;s what we&apos;ve got, already saved, anything to adjust?
        </p>
      )}
      {autoSaveFailed && (
        <p className="text-sm text-destructive">
          Couldn&apos;t save that automatically. Review below and click Save changes to try again.
        </p>
      )}
      <ProfileEditChat currentValues={values} onUpdate={handleEditApplied} />
      <ProfileForm key={formKey} initialValues={values} />
    </div>
  );
}
