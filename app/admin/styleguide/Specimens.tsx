"use client";

// Client, not server: the SearchInput demo passes an onChange handler, and a
// function cannot cross the server/client boundary. Nothing here fetches or
// holds real state, so the cost is only that this file ships to the browser.
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CollapsibleSection,
  DataTable,
  EmptyState,
  PageShell,
  RelativeTime,
  ScoreBadge,
  SearchInput,
  StatRow,
  StatusDot,
  useTableSort,
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
    <section id={id} className="mb-8 scroll-mt-8 border-t border-border pt-6">
      <h2 className="type-eyebrow mb-1">{title}</h2>
      {note && <p className="type-body-sm admin-measure mb-4 text-muted-foreground">{note}</p>}
      <div className={note ? undefined : "mt-4"}>{children}</div>
    </section>
  );
}

/** Prints the token name beside whatever it produces. */
export function Token({ name }: { name: string }) {
  return <code className="type-code text-faint">{name}</code>;
}

export function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-border py-2.5 last:border-b-0">
      <div className="w-56 shrink-0">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// --- Type ------------------------------------------------------------------

const TYPE_ROLES: { cls: string; token: string; spec: string; sample: string }[] = [
  { cls: "type-eyebrow", token: ".type-eyebrow", spec: "12 / 1.2 / 0.08em / 600, uppercase", sample: "Account" },
  { cls: "type-page-title", token: ".type-page-title", spec: "30 / 1.15 / -0.015em / 400, Young Serif", sample: "Leads" },
  { cls: "type-subhead", token: ".type-subhead", spec: "17 / 1.5, max-width 52ch. Rare.", sample: "Copy the prompt into a chat that knows your company." },
  { cls: "type-section-label", token: ".type-section-label", spec: "13 / 1.2 / 0.06em / 600, uppercase", sample: "Worth a call" },
  { cls: "type-table-head", token: ".type-table-head", spec: "12 / 1.2 / 0.06em / 600, uppercase", sample: "Completed" },
  { cls: "type-metric-value", token: ".type-metric-value", spec: "24 / 1.1 / 500, tabular-nums", sample: "1,284" },
  { cls: "type-metric-label", token: ".type-metric-label", spec: "14 / 1.4", sample: "Completed this week" },
  { cls: "type-heading", token: ".type-heading", spec: "17 / 600 / -0.01em", sample: "Call script" },
  { cls: "type-body", token: ".type-body", spec: "15 / 1.55", sample: "Routing rules nobody has fully mapped since the person who built them left." },
  { cls: "type-body-sm", token: ".type-body-sm", spec: "13 / 1.5", sample: "Comma-separated." },
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
  { cls: "text-micro", token: "text-micro", spec: "11.5, stat labels and deltas, small badges" },
  { cls: "text-count", token: "text-count", spec: "12, tabular. Counts beside a filter tab" },
  { cls: "text-control", token: "text-control", spec: "13, tabular. Small buttons, badges, chips" },
  { cls: "text-nav", token: "text-nav", spec: "15 (sidebar only)" },
  { cls: "text-wordmark", token: "text-wordmark", spec: "21 (sidebar only)" },
  { cls: "text-account", token: "text-account", spec: "12.5 (account row name)" },
  { cls: "text-role", token: "text-role", spec: "10.5 (account row role)" },
  { cls: "text-display-sm", token: "text-display-sm", spec: "28 (wizard step titles)" },
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
          <span className={cn("font-archivo", step.cls)}>The quick brown fox 1234567890</span>
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
  { cls: "bg-chip", token: "--ds-chip", value: "#edece8", use: "Neutral chip fill, the code block" },
  { cls: "bg-secondary", token: "--ds-secondary", value: "#edece8", use: "Row hover, the segmented control track" },
  { cls: "bg-border", token: "--ds-border", value: "#e7e5e4", use: "Card outlines, table rules, section rules, quote rules" },
];

const INK_COLORS: Swatch[] = [
  { cls: "bg-card-foreground", token: "--ds-card-foreground", value: "#1c1917", use: "Primary text" },
  { cls: "bg-muted-foreground", token: "--ds-muted-foreground", value: "#78716c", use: "Secondary text, eyebrows, labels" },
  { cls: "bg-faint", token: "--ds-faint", value: "#a8a29e", use: "Tertiary text: timestamps, counts" },
];

const ACCENT_COLORS: Swatch[] = [
  { cls: "bg-brand", token: "--ds-accent", value: "#3a6046", use: "The accent fill. At most once per region" },
  { cls: "bg-brand-weak", token: "--ds-accent-weak", value: "#e4ecdd", use: "Tinted fill behind a 7+ score" },
  { cls: "bg-brand-text", token: "--ds-accent-text", value: "#2c4a36", use: "Accent text on accent-weak (7.4:1)" },
  { cls: "bg-brand-live", token: "--ds-accent-live", value: "#3a6046", use: "The live dot, everywhere" },
];

const ACTION_COLORS: Swatch[] = [
  { cls: "bg-primary", token: "--ds-primary", value: "#1c1917", use: "Primary button fill" },
  { cls: "bg-primary-hover", token: "--ds-primary-hover", value: "#44403c", use: "Primary button hover" },
  { cls: "bg-destructive", token: "--ds-destructive", value: "#dc2626", use: "Errors and destructive actions" },
  { cls: "bg-warning", token: "--ds-warning", value: "#f59e0b", use: "Test badges" },
  { cls: "bg-focus", token: "--ds-focus", value: "#1c1917", use: "The focus ring" },
];

const SIDEBAR_COLORS: Swatch[] = [
  { cls: "bg-sidebar", token: "--ds-sidebar", value: "#121212", use: "The rail ground" },
  { cls: "bg-sidebar-accent", token: "--ds-sidebar-accent", value: "#262626", use: "Nav hover and active fill" },
  { cls: "bg-sidebar-foreground", token: "--ds-sidebar-foreground", value: "#9aa1ac", use: "Inactive nav text" },
  { cls: "bg-sidebar-label", token: "--ds-sidebar-label", value: "#6b6b6b", use: 'The "Workspace" section label' },
  { cls: "bg-sidebar-muted", token: "--ds-sidebar-muted", value: "#f3ecdf", use: "Account role line, at 38%" },
  { cls: "bg-sidebar-plate", token: "--ds-sidebar-plate", value: "#fffdf7", use: "Account plate fill 3%, edge 6%, hover 6%" },
  { cls: "bg-sidebar-avatar", token: "--ds-sidebar-avatar", value: "#5f6bab", use: "Account avatar squircle" },
  { cls: "bg-sidebar-avatar-foreground", token: "--ds-sidebar-avatar-foreground", value: "#fffdf7", use: "Account avatar initials" },
];

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {swatches.map((s) => (
        <div key={s.token} className="flex items-center gap-3 rounded-card border border-border bg-card p-3">
          <div className={cn("h-10 w-10 shrink-0 rounded-control border border-border", s.cls)} />
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
    <div className="flex flex-col gap-5">
      {[
        { heading: "Surfaces", swatches: CORE_COLORS },
        { heading: "Ink", swatches: INK_COLORS },
        { heading: "Accent", swatches: ACCENT_COLORS },
        { heading: "Action and state", swatches: ACTION_COLORS },
        { heading: "Sidebar", swatches: SIDEBAR_COLORS },
      ].map((group) => (
        <div key={group.heading}>
          <h3 className="type-body-sm mb-2 font-semibold">{group.heading}</h3>
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
              <th key={h} className="type-table-head h-9 px-3 text-left align-middle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variants.flatMap((variant) =>
            sizes.map((size) => (
              <tr key={`${variant}-${size}`} className="border-t border-border">
                <td className="px-3 py-2.5 align-middle">
                  <Token name={`${variant} / ${size}`} />
                  <div className="type-body-sm text-faint">{size === "default" ? "h-10" : "h-8"}</div>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <Button variant={variant} size={size}>
                    Copy link
                  </Button>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <Button variant={variant} size={size} className={FORCED_HOVER[variant]}>
                    Copy link
                  </Button>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <Button variant={variant} size={size} disabled>
                    Copy link
                  </Button>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <Button variant={variant} size={size} className={FORCED_FOCUS}>
                    Copy link
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
  { key: "score", header: "Score", align: "right", width: "sm", cell: (r) => r.score },
  {
    key: "when",
    header: "Completed",
    align: "right",
    width: "md",
    cell: (r) => <span className="text-muted-foreground">{r.when}</span>,
  },
];

// --- ScoreBadge ------------------------------------------------------------

const SCORE_TIERS: { score: number | null; band: string; tokens: string }[] = [
  { score: 9, band: "7 to 10", tokens: "--ds-accent-weak on --ds-accent-text" },
  { score: 6, band: "5 to 6", tokens: "--ds-chip on --ds-muted-foreground" },
  { score: 3, band: "1 to 4", tokens: "--ds-chip on --ds-muted-foreground" },
  { score: null, band: "not scored", tokens: "EMPTY_VALUE, no fill" },
];

function ScoreBadges() {
  return (
    <div>
      {SCORE_TIERS.map((tier) => (
        <Row
          key={tier.band}
          label={
            <>
              <Token name={tier.band} />
              <div className="type-body-sm mt-0.5 text-faint">{tier.tokens}</div>
            </>
          }
        >
          <span className="flex items-center gap-4">
            <ScoreBadge score={tier.score} />
            <ScoreBadge score={tier.score} size="sm" />
            <span className="type-body-sm text-faint">md h-7 · sm h-6</span>
          </span>
        </Row>
      ))}
      <p className="type-body-sm mt-2 text-faint">
        Only 7+ carries the accent, because that is the threshold everything else in the product acts
        on. The digit separates a 6 from a 3. The accessible name is always the score out of 10.
      </p>
    </div>
  );
}

// --- RelativeTime ----------------------------------------------------------

const RELATIVE_SAMPLES: { label: string; minutesAgo: number }[] = [
  { label: "minutes", minutesAgo: 14 },
  { label: "hours", minutesAgo: 60 * 5 },
  { label: "days", minutesAgo: 60 * 24 * 3 },
  { label: "months", minutesAgo: 60 * 24 * 70 },
];

function RelativeTimes() {
  return (
    <div>
      {RELATIVE_SAMPLES.map((sample) => (
        <Row key={sample.label} label={<Token name={sample.label} />}>
          <RelativeTime date={new Date(Date.now() - sample.minutesAgo * 60_000)} />
        </Row>
      ))}
      <p className="type-body-sm mt-2 text-faint">
        The visible text is always relative; the absolute stamp is the title attribute and the
        time element&apos;s dateTime. Admin renders no other timestamp format.
      </p>
    </div>
  );
}

// --- CollapsibleSection ----------------------------------------------------

function Collapsibles() {
  return (
    <>
      <Card padding="flush">
        <div className="px-6">
          <CollapsibleSection
            title="Audience and goal"
            summary="RevOps leaders at 100 to 500 person B2B software companies who own lead routing."
            action={
              <Button variant="ghost" size="sm" className="px-0">
                Edit
              </Button>
            }
          >
            <p className="admin-measure type-body">
              Collapsed is the default. The summary is the whole point of the collapsed state.
            </p>
          </CollapsibleSection>
          <CollapsibleSection
            title="Questions"
            summary="6 questions, up to 1 follow-up each"
            defaultOpen
            action={
              <Button variant="ghost" size="sm" className="px-0">
                Edit
              </Button>
            }
          >
            <div className="flex flex-col">
              {["How is lead routing wired today?", "Where does it break?"].map((q, i) => (
                <div key={q} className="flex h-9 items-center gap-4">
                  <span className="w-8 shrink-0 font-archivo text-count text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="type-body">{q}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </Card>
      <p className="type-body-sm mt-2 text-faint">
        h-12 header row, no horizontal padding of its own. Sections stack inside one Card, separated
        by the --ds-border hairline. The Edit action is a sibling layered over the header button,
        never a child.
      </p>
    </>
  );
}

export function Primitives() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="type-body-sm mb-2 font-semibold">
          PageShell + PageHeader <Token name="components/admin/ui" />
        </h3>
        <div className="rounded-card border border-dashed border-border p-4">
          <p className="type-eyebrow">Projects</p>
          <div className="mt-1 flex items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="type-page-title">Revenue operations interviews</span>
              <Badge variant="count">Live</Badge>
            </div>
            <Button size="sm">Copy link</Button>
          </div>
          <p className="type-meta mt-1">Public name: How your team routes inbound leads</p>
        </div>
        <p className="type-body-sm mt-2 text-faint">
          Title row with the actions centred on it, then one meta line of fact. The eyebrow appears
          only on detail pages, where it names the parent object, and on the two account pages that
          have no nav item.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">
          StatRow <Token name="label / value / delta" />
        </h3>
        <StatRow
          stats={[
            { label: "Awaiting contact", value: 9, href: "/admin/leads?status=new" },
            { label: "Completed this week", value: 128, delta: "+12% vs prior week" },
            { label: "Completion rate", value: "74%" },
            { label: "Average score", value: "7.4" },
          ]}
        />
        <p className="type-body-sm mt-2 text-faint">
          One vertical stack per cell: label in micro, number in the metric role, optional delta in
          micro beneath. A value is a number, a percentage or a duration; never a name. Four per page
          at most. Deltas are neutral.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">Card</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <p className="type-heading mb-1">padding=&quot;default&quot;</p>
            <p className="type-body-sm text-muted-foreground">p-6. The usual choice.</p>
          </Card>
          <Card padding="compact">
            <p className="type-heading mb-1">padding=&quot;compact&quot;</p>
            <p className="type-body-sm text-muted-foreground">p-4, for dense rows and link cards.</p>
          </Card>
          <Card padding="flush" interactive>
            <div className="p-4">
              <p className="type-heading mb-1">flush + interactive</p>
              <p className="type-body-sm text-muted-foreground">
                For cards whose child owns the edges. Hover lifts.
              </p>
            </div>
          </Card>
        </div>
        <p className="type-body-sm mt-2 text-faint">
          Never a Card inside a Card: an inner block is a section with a hairline top rule.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">DataTable</h3>
        <DataTable
          columns={DEMO_COLUMNS}
          rows={DEMO_LEADS}
          rowKey={(r) => r.id}
          rowHref={() => "#"}
          empty={{ title: "No leads yet." }}
        />
        <p className="type-body-sm mt-2 text-faint">
          The table draws its own frame; nothing wraps it in a Card. Every cell carries tabular
          figures and numeric columns declare align=&quot;right&quot;.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">ScoreBadge</h3>
        <ScoreBadges />
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">RelativeTime</h3>
        <RelativeTimes />
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">CollapsibleSection</h3>
        <Collapsibles />
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">EmptyState</h3>
        <EmptyState title="No completed interviews yet." action={<Button size="sm">New study</Button>} />
        <p className="type-body-sm mt-2 text-faint">
          One sentence, one optional action, no chrome. DataTable renders this bare when it has no
          rows: no column headers, no frame.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">SearchInput</h3>
        <SearchInput value="" onChange={() => {}} placeholder="Name, company, keyword" label="Demo search" />
        <p className="type-body-sm mt-2 text-faint">
          Static here. FilterTabs is a client component and is demonstrated on Leads and Projects.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">Badge</h3>
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
        <p className="type-body-sm mt-2 text-faint">
          Count badges and status badges on detail pages are neutral (count). accent and live exist
          for the one accent instance a region is allowed.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">StatusDot</h3>
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
        <p className="type-body-sm mt-2 text-faint">
          Status renders once per row: dot plus a text label in tables, a neutral badge on detail
          pages.
        </p>
      </div>
    </div>
  );
}

// --- DataTable, extended ---------------------------------------------------

type DemoRow = {
  id: string;
  name: string;
  note: string;
  score: number | null;
  minutesAgo: number;
};

const DEMO_ROWS: DemoRow[] = [
  {
    id: "1",
    name: "Priya Raman",
    note: "Routing rules nobody has fully mapped since the person who built them left last year",
    score: 9,
    minutesAgo: 120,
  },
  {
    id: "2",
    name: "Marcus Bell",
    note: "Scoring model in a spreadsheet, uploaded to the CRM every Monday morning",
    score: 6,
    minutesAgo: 60 * 30,
  },
  { id: "3", name: "Ana Oyelaran", note: "Nothing here is his to run", score: null, minutesAgo: 60 * 24 * 4 },
];

function StatusSelectCell() {
  const [value, setValue] = useState("new");
  return (
    // The documented pattern for an interactive cell inside a linked row: the
    // select keeps its own pointer events (DataTable), and the guard here
    // keeps the click from bubbling any further than the control.
    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <select
        aria-label="Demo status"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="focus-ring flex h-8 rounded-pill border border-border bg-card px-3 font-archivo text-control text-card-foreground"
      >
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
      </select>
    </span>
  );
}

const EXTENDED_COLUMNS: Column<DemoRow>[] = [
  {
    key: "name",
    header: "Name",
    width: 0.26,
    cell: (r) => <span className="font-medium">{r.name}</span>,
  },
  {
    key: "note",
    header: "Truncated",
    width: 0.34,
    truncate: true,
    title: (r) => r.note,
    cell: (r) => <span className="text-muted-foreground">{r.note}</span>,
  },
  {
    key: "score",
    header: "Score",
    align: "center",
    width: "xs",
    sortable: true,
    sortValue: (r) => r.score,
    cell: (r) => <ScoreBadge score={r.score} />,
  },
  { key: "status", header: "Status", width: "md", cell: () => <StatusSelectCell /> },
  {
    key: "when",
    header: "Completed",
    align: "right",
    width: "md",
    sortable: true,
    sortValue: (r) => -r.minutesAgo,
    cell: (r) => (
      <RelativeTime
        date={new Date(Date.now() - r.minutesAgo * 60_000)}
        align="right"
        className="text-muted-foreground"
      />
    ),
  },
];

export function DataTableStates() {
  const defaultDensity = useTableSort(DEMO_ROWS, EXTENDED_COLUMNS, {
    key: "score",
    direction: "asc",
  });
  const compact = useTableSort(DEMO_ROWS, EXTENDED_COLUMNS);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="type-body-sm mb-2 font-semibold">
          density=&quot;default&quot; <Token name="h-12 rows, h-9 header" />
        </h3>
        <DataTable
          columns={EXTENDED_COLUMNS}
          rows={defaultDensity.rows}
          rowKey={(r) => r.id}
          rowHref={() => "#primitives"}
          layout="fixed"
          sort={defaultDensity.sort}
          onSort={defaultDensity.onSort}
          empty={{ title: "Nothing here." }}
        />
        <p className="type-body-sm mt-2 text-faint">
          Score is sorted ascending, so its header chevron points up. Nulls sort last in both
          directions. Hover a row: the whole row is a link, the name underlines, and the Status
          select does not navigate.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">
          density=&quot;compact&quot; <Token name="h-10 rows" />
        </h3>
        <DataTable
          columns={EXTENDED_COLUMNS}
          rows={compact.rows}
          rowKey={(r) => r.id}
          density="compact"
          layout="fixed"
          sort={compact.sort}
          onSort={compact.onSort}
          empty={{ title: "Nothing here." }}
        />
        <p className="type-body-sm mt-2 text-faint">
          Widths are fractions (0.26, 0.34) or one of the named steps xxs / xs / sm / md / lg (w-10,
          w-16, w-24, w-32, w-44) for columns whose content has a known size; layout=&quot;fixed&quot;
          is what makes the truncating column actually truncate.
        </p>
      </div>

      <div>
        <h3 className="type-body-sm mb-2 font-semibold">
          empty <Token name="no rows" />
        </h3>
        <DataTable
          columns={EXTENDED_COLUMNS}
          rows={[]}
          rowKey={(r) => r.id}
          layout="fixed"
          empty={{ title: "No leads match these filters." }}
        />
        <p className="type-body-sm mt-2 text-faint">
          No column headers and no frame around an empty table.
        </p>
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
              <div className="type-body-sm text-faint">{s.px}</div>
            </>
          }
        >
          <div className="h-4 rounded-control bg-chip" style={{ width: `var(${s.token})` }} />
        </Row>
      ))}
      <p className="type-body-sm mt-2 text-faint">
        Base unit 8. These are the only allowed steps. Vertical rhythm: 32 between the page header
        and the first block, 32 between major blocks, 8 to 12 inside a group.
      </p>
    </div>
  );
}

const RADII = [
  { token: "--ds-radius-control", cls: "rounded-control", label: "8: inputs, selects, chips" },
  { token: "--ds-radius-card", cls: "rounded-card", label: "12: every card, table frame and panel" },
  { token: "--ds-radius-pill", cls: "rounded-pill", label: "999: every button, badge, dot" },
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
          <div className={cn("h-12 w-28 border border-border bg-chip", r.cls)} />
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
        <p className="type-body-sm mt-1 text-muted-foreground">Card elevation. Tables and stat bars carry none.</p>
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
      <p className="type-body-sm admin-measure text-muted-foreground">
        One rule for the whole surface: <Token name=".focus-ring" /> draws a ring in{" "}
        <Token name="--ds-focus" /> at an offset. An outline is never removed without this
        replacing it.
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
