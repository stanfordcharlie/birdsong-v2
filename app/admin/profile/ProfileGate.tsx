"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyProfileSetupFlow } from "./CompanyProfileSetupFlow";
import { CompanyProfileView, type CompanyProfileValues } from "./CompanyProfileView";
import { AiFillFlow } from "./AiFillFlow";
import { EmptyState, PageHeader, PageShell } from "@/components/admin/ui";
import { PASTE_EXTRACTION_FIELDS } from "@/lib/profile-onboarding/company-profile-fields";

type AiFillResult = {
  mergedData: Record<string, string>;
  draftedKeys: Set<string>;
  thinNote: string;
};

const TOTAL_SECTIONS = new Set(PASTE_EXTRACTION_FIELDS.map((f) => f.section)).size;

// Fields the paste extracted only ever fill in blanks: any field the admin
// already has a value for (typed manually, set during onboarding, or edited
// via "Edit with AI") is left exactly as it is.
function mergeAiFields(
  base: Record<string, string>,
  extracted: Partial<Record<string, string>>
): { merged: Record<string, string>; draftedKeys: Set<string> } {
  const merged = { ...base };
  const draftedKeys = new Set<string>();
  for (const [key, value] of Object.entries(extracted)) {
    if (!value) continue;
    if ((base[key] || "").trim().length > 0) continue;
    merged[key] = value;
    draftedKeys.add(key);
  }
  return { merged, draftedKeys };
}

function buildThinNote(draftedKeys: Set<string>): string {
  if (draftedKeys.size === 0) {
    return "Didn't find anything usable in that paste. No problem, fill in the sections below.";
  }
  const filledSections = new Set(
    PASTE_EXTRACTION_FIELDS.filter((f) => draftedKeys.has(f.key)).map((f) => f.section)
  ).size;
  return `Filled ${filledSections} of ${TOTAL_SECTIONS} sections from your paste. Review and fill in the rest below.`;
}

export function ProfileGate({
  orgId,
  readOnly = false,
  hasExistingData,
  initialValues,
  setupInitialData,
}: {
  // The organization whose profile this is. Every write below goes through
  // the browser client under RLS, and the row is keyed by org, so the
  // server page resolves it once and the client components carry it.
  orgId: string;
  // From can(role, "profile:edit") on the server. A member reads the
  // profile as it is; the setup wizard, AI fill and every edit control are
  // for owners and admins.
  readOnly?: boolean;
  hasExistingData: boolean;
  initialValues: CompanyProfileValues;
  setupInitialData: Record<string, string>;
}) {
  const router = useRouter();
  const [justFinishedSetup, setJustFinishedSetup] = useState(false);
  const [mode, setMode] = useState<"gate" | "ai-fill">("gate");
  const [aiFillResult, setAiFillResult] = useState<AiFillResult | null>(null);

  function handleExtracted(fields: Partial<Record<string, string>>) {
    const { merged, draftedKeys } = mergeAiFields(setupInitialData, fields);
    setAiFillResult({ mergedData: merged, draftedKeys, thinNote: buildThinNote(draftedKeys) });
    setMode("gate");
  }

  if (readOnly) {
    if (!hasExistingData) {
      return (
        <PageShell>
          <PageHeader eyebrow="Account" title="Company profile" />
          <EmptyState title="No company profile yet. An owner or admin can set one up." />
        </PageShell>
      );
    }
    return (
      <CompanyProfileView
        orgId={orgId}
        readOnly
        initialValues={initialValues}
        onFactoryReset={() => router.refresh()}
        onStartAiFill={() => undefined}
      />
    );
  }

  if (mode === "ai-fill") {
    return <AiFillFlow onCancel={() => setMode("gate")} onExtracted={handleExtracted} />;
  }

  if (!hasExistingData || aiFillResult) {
    return (
      <CompanyProfileSetupFlow
        orgId={orgId}
        initialData={aiFillResult ? aiFillResult.mergedData : setupInitialData}
        aiDraftedKeys={aiFillResult?.draftedKeys}
        startAtStep={aiFillResult ? 0 : undefined}
        thinResultNote={aiFillResult?.thinNote}
        onRequestAiFill={() => setMode("ai-fill")}
        onDone={() => {
          setAiFillResult(null);
          setJustFinishedSetup(true);
          router.refresh();
        }}
      />
    );
  }

  return (
    <CompanyProfileView
      orgId={orgId}
      initialValues={initialValues}
      justFinishedSetup={justFinishedSetup}
      onFactoryReset={() => router.refresh()}
      onStartAiFill={() => setMode("ai-fill")}
    />
  );
}
