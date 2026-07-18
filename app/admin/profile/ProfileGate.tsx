"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CompanyProfileSetupFlow } from "./CompanyProfileSetupFlow";
import { CompanyProfileView, type CompanyProfileValues } from "./CompanyProfileView";

export function ProfileGate({
  hasExistingData,
  initialValues,
  setupInitialData,
}: {
  hasExistingData: boolean;
  initialValues: CompanyProfileValues;
  setupInitialData: Record<string, string>;
}) {
  const router = useRouter();
  const [justFinishedSetup, setJustFinishedSetup] = useState(false);

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
    <CompanyProfileView
      initialValues={initialValues}
      justFinishedSetup={justFinishedSetup}
      onFactoryReset={() => router.refresh()}
    />
  );
}
