import { getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/admin/ui";
import {
  Buttons,
  Colors,
  DataTableStates,
  Elevation,
  FocusDemo,
  Primitives,
  RadiusScale,
  Section,
  SpacingScale,
  Timing,
  TypeScale,
} from "./Specimens";

// The reference for every future design session. Deliberately not linked in
// the sidebar: it is a tool, not a destination.
//
// Auth: middleware.ts gates /admin/:path* and only exempts the four public
// auth routes, so this route is behind the session cookie by construction.
// The null return below matches what every other admin page does rather than
// adding a second, different gate.

export const metadata = { title: "Styleguide · Birdsong" };

const CONTENTS = [
  ["type", "Type"],
  ["color", "Color"],
  ["buttons", "Buttons"],
  ["primitives", "Primitives"],
  ["datatable", "DataTable"],
  ["spacing", "Spacing"],
  ["radius", "Radius"],
  ["shadow", "Shadow"],
  ["timing", "Timing"],
  ["focus", "Focus"],
] as const;

export default async function StyleguidePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <PageShell>
      <PageHeader
        title="Styleguide"
        meta={
          <>
            Ledger II. Every token and primitive the admin surface is built from.{" "}
            <code className="type-code text-muted-foreground">app/globals.css</code> is the source
            of truth; DESIGN.md mirrors it.
          </>
        }
      />

      <nav aria-label="Contents" className="mb-6 flex flex-wrap gap-x-4 gap-y-1">
        {CONTENTS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="focus-ring ds-small rounded-[var(--ds-radius-chip)] text-[color:hsl(var(--ds-accent))] underline underline-offset-2"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="type"
        title="Type"
        note="Manrope sets every word. IBM Plex Mono sets every number, score, count, timestamp and keyboard hint. The ds styles carry size, weight, line height and tracking, never a colour."
      >
        <TypeScale />
      </Section>

      <Section
        id="color"
        title="Color"
        note="One accent. Status colours are for badges and dots and nowhere else. No beige, cream or gradient."
      >
        <Colors />
      </Section>

      <Section id="buttons" title="Buttons" note="One shape, 34px, on the control radius. Never a pill.">
        <Buttons />
      </Section>

      <Section
        id="primitives"
        title="Primitives"
        note="components/admin/ui. Admin imports from here; respondent and marketing import from components/ui; neither side edits the other's copy."
      >
        <Primitives />
      </Section>

      <Section
        id="datatable"
        title="DataTable"
        note="42px header on the sidebar ground, 60px two-line rows or 54px one-line rows, 20px at the ends and 16px between columns."
      >
        <DataTableStates />
      </Section>

      <Section id="spacing" title="Spacing" note="A 4px scale, and the four shell and control sizes.">
        <SpacingScale />
      </Section>

      <Section id="radius" title="Radius">
        <RadiusScale />
      </Section>

      <Section id="shadow" title="Shadow" note="Borders, not shadows. These three are the only ones.">
        <Elevation />
      </Section>

      <Section id="timing" title="Timing" note="Motion means live. Enters run once per page load.">
        <Timing />
      </Section>

      <Section id="focus" title="Focus">
        <FocusDemo />
      </Section>
    </PageShell>
  );
}
