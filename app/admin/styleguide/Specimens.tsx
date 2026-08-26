"use client";

// Client, not server: the SearchInput demo passes an onChange handler, and a
// function cannot cross the server/client boundary. Nothing here fetches or
// holds real state, so the cost is only that this file ships to the browser.
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  PageShell,
  SearchInput,
  StatRow,
  StatusDot,
  type Column,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";

// Shared furniture for the styleguide. Kept out of page.tsx so that file
// reads as a table of contents rather than a wall of layout.

export function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-8 border-t border-border pt-8">
      <h2 className="type-section-label mb-1">{title}</h2>
      {note && <p className="type-body admin-measure mb-5 text-muted-foreground">{note}</p>}
      <div className={note ? undefined : "mt-5"}>{children}</div>
    </section>
  );
}

/** Prints the token name beside whatever it produces. */
export function Token({ name }: { name: string }) {
  return <code className="type-code text-faint">{name}</code>;
}

export function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-chip py-3 last:border-b-0">
      <div className="w-[220px] shrink-0">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// --- Type ------------------------------------------------------------------

const TYPE_ROLES: { cls: string; token: string; spec: string; sample: string }[] = [
  { cls: "type-eyebrow", token: ".type-eyebrow", spec: "12 / 1.2 / 0.08em / 600, uppercase", sample: "Company profile" },
  { cls: "type-page-title", token: ".type-page-title", spec: "44 / 1.05 / -0.02em / 400, Young Serif", sample: "Your lead queue" },
  { cls: "type-subhead", token: ".type-subhead", spec: "17 / 1.5, max-width 52ch", sample: "Nine leads scored 7 or higher and have not heard back yet." },
  { cls: "type-section-label", token: ".type-section-label", spec: "13 / 1.2 / 0.06em / 600, uppercase", sample: "Worth a call today" },
  { cls: "type-table-head", token: ".type-table-head", spec: "12 / 1.2 / 0.06em / 600, uppercase", sample: "Completed" },
  { cls: "type-metric-value", token: ".type-metric-value", spec: "32 / 1.1 / 500, tabular-nums", sample: "1,284" },
  { cls: "type-metric-label", token: ".type-metric-label", spec: "14 / 1.4", sample: "Interviews completed" },
  { cls: "type-heading", token: ".type-heading", spec: "17 / 600 / -0.01em", sample: "Nothing needs you right now" },
  { cls: "type-body", token: ".type-body", spec: "15 / 1.55", sample: "Every survey uses this to ask sharper questions." },
  { cls: "type-body-sm", token: ".type-body-sm", spec: "13 / 1.5", sample: "Comma-separated descriptors, in whatever words fit." },
  { cls: "type-meta", token: ".type-meta", spec: "13, muted", sample: "Started 4h ago" },
  { cls: "type-code", token: ".type-code", spec: "13 / 1.5, monospace", sample: "?src=newsletter" },
];

export function TypeScale() {
  return (
    <div>
      {TYPE_ROLES.map((role) => (
        <Row
          key={role.token}
          label={
            <>
              <Token name={role.token} />
              <div className="type-body-sm mt-0.5 text-faint">{role.spec}</div>
            </>
          }
        >
          <span className={role.cls}>{role.sample}</span>
        </Row>
      ))}
    </div>
  );
}

// Named font-size steps. These exist because a control needs a size without
// also inheriting a colour and a line height, which the .type-* roles carry.
const FONT_STEPS = [
  { cls: "text-micro", token: "text-micro", spec: "11.5px" },
  { cls: "text-count", token: "text-count", spec: "12px" },
  { cls: "text-control", token: "text-control", spec: "13px" },
  { cls: "text-nav", token: "text-nav", spec: "15px (sidebar only)" },
  { cls: "text-wordmark", token: "text-wordmark", spec: "21px (sidebar only)" },
  { cls: "text-display-sm", token: "text-display-sm", spec: "28px (wizard step titles)" },
];

export function FontSteps() {
  return (
    <div>
      {FONT_STEPS.map((step) => (
        <Row
          key={step.token}
          label={
            <>
              <Token name={step.token} />
              <div className="type-body-sm mt-0.5 text-faint">{step.spec}</div>
            </>
          }
        >
          <span className={cn("font-archivo", step.cls)}>The quick brown fox</span>
        </Row>
      ))}
    </div>
  );
}

// --- Color -----------------------------------------------------------------

type Swatch = { cls: string; token: string; value: string; use: string };

const CORE_COLORS: Swatch[] = [
  { cls: "bg-page", token: "--ds-page-background", value: "#f8f8f7", use: "The app canvas, set on AdminShell" },
  { cls: "bg-card", token: "--ds-card", value: "#ffffff", use: "Every card and table surface" },
  { cls: "bg-chip", token: "--ds-chip", value: "#edece8", use: "Hairlines inside a card, neutral chip fill" },
  { cls: "bg-secondary", token: "--ds-secondary", value: "#edece8", use: "Row hover, quote blocks, sunken panels" },
  { cls: "bg-border", token: "--ds-border", value: "#e7e5e4", use: "Card outlines, section dividers" },
];

const INK_COLORS: Swatch[] = [
  { cls: "bg-card-foreground", token: "--ds-card-foreground", value: "#1c1917", use: "Primary text" },
  { cls: "bg-muted-foreground", token: "--ds-muted-foreground", value: "#78716c", use: "Secondary text, eyebrows, labels" },
  { cls: "bg-faint", token: "--ds-faint", value: "#a8a29e", use: "Tertiary text: timestamps, counts" },
];

const ACCENT_COLORS: Swatch[] = [
  { cls: "bg-brand", token: "--ds-accent", value: "#3a6046", use: "Score bars, avatars, the accent fill" },
  { cls: "bg-brand-weak", token: "--ds-accent-weak", value: "#e4ecdd", use: "Tinted accent fill behind accent text" },
  { cls: "bg-brand-text", token: "--ds-accent-text", value: "#2c4a36", use: "Accent text on accent-weak (7.4:1)" },
  { cls: "bg-brand-live", token: "--ds-accent-live", value: "#3a6046", use: "The live dot, everywhere" },
];

const ACTION_COLORS: Swatch[] = [
  { cls: "bg-primary", token: "--ds-primary", value: "#1c1917", use: "Primary button fill" },
  { cls: "bg-primary-hover", token: "--ds-primary-hover", value: "#44403c", use: "Primary button hover" },
  { cls: "bg-destructive", token: "--ds-destructive", value: "#dc2626", use: "Errors and destructive actions" },
  { cls: "bg-warning", token: "--ds-warning", value: "#f59e0b", use: "Test badges, draft markers" },
  { cls: "bg-focus", token: "--ds-focus", value: "#1c1917", use: "The focus ring, 2px at 2px offset" },
];

const COVER_COLORS: Swatch[] = [
  { cls: "bg-cover-1", token: "--ds-cover-1", value: "#e4ecdd", use: "Survey card cover, bucket 1" },
  { cls: "bg-cover-2", token: "--ds-cover-2", value: "#edece8", use: "Survey card cover, bucket 2" },
  { cls: "bg-cover-3", token: "--ds-cover-3", value: "#dfe6ea", use: "Survey card cover, bucket 3" },
];

const SIDEBAR_COLORS: Swatch[] = [
  { cls: "bg-sidebar", token: "--ds-sidebar", value: "#121212", use: "The rail ground" },
  { cls: "bg-sidebar-accent", token: "--ds-sidebar-accent", value: "#262626", use: "Nav hover and active fill" },
  { cls: "bg-sidebar-foreground", token: "--ds-sidebar-foreground", value: "#9aa1ac", use: "Inactive nav text" },
  { cls: "bg-sidebar-label", token: "--ds-sidebar-label", value: "#6b6b6b", use: 'The "Workspace" section label' },
  { cls: "bg-sidebar-muted", token: "--ds-sidebar-muted", value: "#d8d2c4", use: "Plate secondary text" },
  { cls: "bg-sidebar-plate", token: "--ds-sidebar-plate", value: "#ffffff", use: "Plate fill and border, at low alpha" },
];

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {swatches.map((s) => (
        <div key={s.token} className="flex items-center gap-3 rounded-card border border-border bg-card p-3">
          <div className={cn("h-12 w-12 shrink-0 rounded-control border border-border", s.cls)} />
          <div className="min-w-0">
            <Token name={s.token} />
            <div className="type-body-sm text-faint">{s.value}</div>
            <div className="type-body-sm mt-0.5 text-muted-foreground">{s.use}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Colors() {
  return (
    <div className="flex flex-col gap-6">
      {[
        { heading: "Surfaces", swatches: CORE_COLORS },
        { heading: "Ink", swatches: INK_COLORS },
        { heading: "Accent", swatches: ACCENT_COLORS },
        { heading: "Action and state", swatches: ACTION_COLORS },
        { heading: "Survey card covers", swatches: COVER_COLORS },
        { heading: "Sidebar", swatches: SIDEBAR_COLORS },
      ].map((group) => (
        <div key={group.heading}>
          <h3 className="type-body-sm mb-2.5 font-semibold">{group.heading}</h3>
          <SwatchGrid swatches={group.swatches} />
        </div>
      ))}
    </div>
  );
}

// --- Buttons ---------------------------------------------------------------

// Hover and focus cannot be triggered in a static render, so those two columns
// apply the classes the state would produce. The default and disabled columns
// are real. Tab through this table to confirm the live ring matches the
// simulated one.
const FORCED_HOVER: Record<string, string> = {
  primary: "bg-primary-hover",
  secondary: "bg-secondary",
  ghost: "text-card-foreground underline",
};
const FORCED_FOCUS = "ring-2 ring-focus ring-offset-2 ring-offset-page";

export function Buttons() {
  const variants = ["primary", "secondary", "ghost"] as const;
  const sizes = ["default", "sm"] as const;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Variant / size", "Default", "Hover", "Disabled", "Focus"].map((h) => (
              <th key={h} className="type-table-head h-10 px-4 text-left align-middle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.flatMap((variant) =>
            sizes.map((size) => (
              <tr key={`${variant}-${size}`} className="border-t border-chip">
                <td className="px-4 py-3 align-middle">
                  <Token name={`${variant} / ${size}`} />
                  <div className="type-body-sm text-faint">
                    {size === "default" ? "h-10, px-20" : "h-8, px-14"}
                  </div>
                </td>
                <td className="px-4 py-3 align-middle">
                  <Button variant={variant} size={size}>
                    Share link
                  </Button>
                </td>
                <td className="px-4 py-3 align-middle">
                  <Button variant={variant} size={size} className={FORCED_HOVER[variant]}>
                    Share link
                  </Button>
                </td>
                <td className="px-4 py-3 align-middle">
                  <Button variant={variant} size={size} disabled>
                    Share link
                  </Button>
                </td>
                <td className="px-4 py-3 align-middle">
                  <Button variant={variant} size={size} className={FORCED_FOCUS}>
                    Share link
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Primitives ------------------------------------------------------------

type DemoLead = {
  id: string;
  name: string;
  company: string;
  score: number;
  when: string;
};

const DEMO_LEADS: DemoLead[] = [
  { id: "1", name: "Priya Raman", company: "Northwind Logistics", score: 9, when: "2h ago" },
  { id: "2", name: "Marcus Bell", company: "Lattice Health", score: 8, when: "Yesterday" },
  { id: "3", name: "Ana Oyelaran", company: "Fernbrook Capital", score: 6, when: "3d ago" },
];

const DEMO_COLUMNS: Column<DemoLead>[] = [
  { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
  { key: "company", header: "Company", cell: (r) => <span className="text-muted-foreground">{r.company}</span> },
  { key: "score", header: "Score", align: "right", width: "90px", cell: (r) => r.score },
  {
    key: "when",
    header: "Completed",
    align: "right",
    width: "120px",
    cell: (r) => <span className="text-muted-foreground">{r.when}</span>,
  },
];

export function Primitives() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">
          PageShell + PageHeader <Token name="components/admin/ui" />
        </h3>
        <div className="rounded-card border border-dashed border-border p-4">
          <p className="type-body-sm mb-3 text-faint">
            Rendered inline at reduced scale. On a real page PageShell is the outermost element and
            supplies the 1140px measure.
          </p>
          <p className="type-eyebrow">Leads</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="type-page-title">Your lead queue</span>
            <Badge variant="count">42</Badge>
          </div>
          <p className="type-subhead mt-3">
            Nine leads scored 7 or higher and have not heard back yet.
          </p>
        </div>
      </div>

      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">
          StatRow <Token name="one layout for every page" />
        </h3>
        <StatRow
          stats={[
            { label: "Awaiting first contact", value: 9, href: "/admin/leads?status=new" },
            { label: "Interviews completed", value: 128 },
            { label: "Completion rate", value: "74%", hint: "of starts finish" },
            { label: "Average lead score", value: "7.4" },
          ]}
        />
      </div>

      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">Card</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <p className="type-heading mb-1">padding=&quot;default&quot;</p>
            <p className="type-body text-muted-foreground">24px inset. The usual choice.</p>
          </Card>
          <Card padding="compact">
            <p className="type-heading mb-1">padding=&quot;compact&quot;</p>
            <p className="type-body text-muted-foreground">16px inset, for dense rows.</p>
          </Card>
          <Card padding="flush" interactive>
            <div className="h-[52px] bg-cover-1" />
            <div className="p-4">
              <p className="type-heading mb-1">flush + interactive</p>
              <p className="type-body text-muted-foreground">
                For cards whose child owns the edges. Hover lifts.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">DataTable</h3>
        <Card padding="flush">
          <DataTable
            columns={DEMO_COLUMNS}
            rows={DEMO_LEADS}
            rowKey={(r) => r.id}
            rowHref={() => "#"}
            empty={{ title: "No leads yet" }}
          />
        </Card>
        <p className="type-body-sm mt-2 text-faint">
          Score and Completed right-align with tabular figures because their columns declare
          align=&quot;right&quot;, not because the call site styled the cells.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">EmptyState</h3>
        <Card padding="flush">
          <EmptyState
            title="No completed interviews yet"
            description="As respondents finish interviews, every lead across all your surveys lands here, hottest first."
            action={<Button>Create a survey</Button>}
          />
        </Card>
      </div>

      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">SearchInput</h3>
        <SearchInput value="" onChange={() => {}} placeholder="Name, company, keyword" label="Demo search" />
        <p className="type-body-sm mt-2 text-faint">
          Static here. FilterTabs is a client component and is demonstrated on Leads and Surveys.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">Badge</h3>
        <div className="flex flex-wrap items-center gap-2">
          {(["count", "accent", "live", "draft", "warning", "outline"] as const).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
          {(["count", "accent", "outline"] as const).map((v) => (
            <Badge key={`${v}-sm`} variant={v} size="sm">
              {v} sm
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h3 className="type-body-sm mb-2.5 font-semibold">StatusDot</h3>
        <div className="flex flex-wrap items-center gap-6">
          <span className="type-body inline-flex items-center gap-2">
            <StatusDot live /> live
          </span>
          <span className="type-body inline-flex items-center gap-2">
            <StatusDot live pulse /> live, pulsing
          </span>
          <span className="type-body inline-flex items-center gap-2">
            <StatusDot live={false} /> not live
          </span>
        </div>
      </div>
    </div>
  );
}

// --- Scales ----------------------------------------------------------------

const SPACING = [
  { token: "--ds-space-1", px: 4 },
  { token: "--ds-space-2", px: 8 },
  { token: "--ds-space-3", px: 12 },
  { token: "--ds-space-4", px: 16 },
  { token: "--ds-space-5", px: 24 },
  { token: "--ds-space-6", px: 32 },
  { token: "--ds-space-7", px: 40 },
  { token: "--ds-space-8", px: 56 },
  { token: "--ds-space-9", px: 72 },
];

export function SpacingScale() {
  return (
    <div>
      {SPACING.map((s) => (
        <Row
          key={s.token}
          label={
            <>
              <Token name={s.token} />
              <div className="type-body-sm text-faint">{s.px}px</div>
            </>
          }
        >
          <div className="h-4 rounded-control bg-brand-weak" style={{ width: `${s.px}px` }} />
        </Row>
      ))}
      <p className="type-body-sm mt-3 text-faint">
        Base unit 8. These are the only allowed steps. Vertical rhythm: 32 between the page header
        and the first block, 40 between major blocks.
      </p>
    </div>
  );
}

const RADII = [
  { token: "--ds-radius-control", cls: "rounded-control", label: "8px: inputs, selects, small chips" },
  { token: "--ds-radius-card", cls: "rounded-card", label: "12px: every card and panel" },
  { token: "--ds-radius-pill", cls: "rounded-pill", label: "999px: every button, badge, dot, meter" },
];

export function RadiusScale() {
  return (
    <div>
      {RADII.map((r) => (
        <Row
          key={r.token}
          label={
            <>
              <Token name={r.token} />
              <div className="type-body-sm text-faint">{r.label}</div>
            </>
          }
        >
          <div className={cn("h-12 w-28 border border-border bg-brand-weak", r.cls)} />
        </Row>
      ))}
    </div>
  );
}

export function Elevation() {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="rounded-card border border-border bg-card p-5 shadow-card">
        <Token name="--ds-shadow-card" />
        <p className="type-body-sm mt-1 text-muted-foreground">The one card elevation.</p>
      </div>
      <div className="rounded-card border border-border bg-card p-5 shadow-card-hover">
        <Token name="--ds-shadow-card-hover" />
        <p className="type-body-sm mt-1 text-muted-foreground">Hover step, for cards that are links.</p>
      </div>
    </div>
  );
}

export function FocusDemo() {
  return (
    <div className="flex flex-col gap-3">
      <p className="type-body admin-measure text-muted-foreground">
        One rule for the whole surface: <Token name=".focus-ring" /> gives a 2px ring in{" "}
        <Token name="--ds-focus" /> at 2px offset. Tab into the controls below to see it. An outline
        is never removed without this replacing it.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button>Focusable button</Button>
        <a href="#focus" className="focus-ring rounded-control px-2 py-1 underline">
          Focusable link
        </a>
        <input
          aria-label="Focusable input"
          placeholder="Focusable input"
          className="focus-ring h-9 rounded-control border border-input bg-card px-3 font-archivo text-sm"
        />
      </div>
      <p className="type-body-sm text-faint">
        The dark rail uses a light ring against the sidebar ground instead, since the ink ring would
        disappear there. See AdminSidebar.
      </p>
    </div>
  );
}

export { PageShell };
