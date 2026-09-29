"use client";

import { useState } from "react";
import { SectionTabs } from "@/components/admin/ui";

// The lead page's sections. The panels are rendered by the server view and
// handed in whole; this only decides which one is on screen. Every panel
// stays mounted, so a half-written note on Activity survives a look at the
// transcript.

export type LeadTab = "transcript" | "summary" | "script" | "activity";

export function LeadTabs({
  tabs,
}: {
  /** In display order. The first one is the default. */
  tabs: { value: LeadTab; label: string; panel: React.ReactNode }[];
}) {
  const [active, setActive] = useState<LeadTab>(tabs[0]?.value ?? "transcript");

  return (
    <>
      <SectionTabs
        label="Lead sections"
        tabs={tabs.map(({ value, label }) => ({ value, label }))}
        value={active}
        onChange={setActive}
      />
      {tabs.map((tab) => (
        <div key={tab.value} role="tabpanel" aria-label={tab.label} hidden={tab.value !== active}>
          {tab.panel}
        </div>
      ))}
    </>
  );
}
