import { getCurrentUser } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/admin/ui";
import {
  Buttons,
  Colors,
  Elevation,
  FocusDemo,
  FontSteps,
  Primitives,
  RadiusScale,
  Section,
  SpacingScale,
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
  ["type", "Type scale"],
  ["font-steps", "Named font sizes"],
  ["color", "Color"],
  ["buttons", "Buttons"],
  ["primitives", "Primitives"],
  ["spacing", "Spacing"],
  ["radius", "Radius"],
  ["elevation", "Elevation"],
  ["focus", "Focus"],
] as const;

export default async function StyleguidePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Reference"
        title="Styleguide"
        subtitle={
          <>
            Every token and primitive the admin surface is built from.{" "}
            <code className="type-code">app/globals.css</code> is the single source of truth; this
            page renders it, and DESIGN.md describes it in prose. Copy the token from here rather
            than deriving a new value.
          </>
        }
      />

      <nav aria-label="Contents" className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {CONTENTS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="focus-ring type-body-sm rounded-control text-muted-foreground underline underline-offset-2">
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="type"
        title="Type scale"
        note="Pages reference these roles, never a raw size. Young Serif is page-title only; everything else is Archivo. Eyebrow and section label are two roles rather than one, so the label over an H1 and the label over a card section do not render identically."
      >
        <TypeScale />
      </Section>

      <Section
        id="font-steps"
        title="Named font sizes"
        note="For controls, which need a size without also inheriting a colour and a line height. A primitive uses these instead of writing a raw px value."
      >
        <FontSteps />
      </Section>

      <Section
        id="color"
        title="Color"
        note="Beige and cream are banned. Green is a real token now (accent), not an informal reuse of the status colour it used to borrow."
      >
        <Colors />
      </Section>

      <Section
        id="buttons"
        title="Buttons"
        note="Three variants, one shape. Every button is a pill. A bare text link that navigates is a ghost button, not an anchor styled at the call site. Hover and focus columns apply the classes those states produce, since a static render cannot trigger them; tab through the table to check the live ring matches."
      >
        <Buttons />
      </Section>

      <Section
        id="primitives"
        title="Primitives"
        note="components/admin/ui. Admin imports from here; respondent and marketing import from components/ui; neither side edits the other's copy."
      >
        <Primitives />
      </Section>

      <Section id="spacing" title="Spacing">
        <SpacingScale />
      </Section>

      <Section id="radius" title="Radius">
        <RadiusScale />
      </Section>

      <Section id="elevation" title="Elevation">
        <Elevation />
      </Section>

      <Section id="focus" title="Focus">
        <FocusDemo />
      </Section>
    </PageShell>
  );
}
