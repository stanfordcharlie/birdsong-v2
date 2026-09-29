"use client";

// Client, not server: several demos hold state (tabs, search, sort), and a
// handler cannot cross the server/client boundary. Nothing here fetches, so
// the cost is only that this file ships to the browser.
import { useState } from "react";
import {
  BADGE_STATES,
  Badge,
  Button,
  Card,
  CollapsibleSection,
  Crumbs,
  DataTable,
  EmptyState,
  FilterTabs,
  FloatingBar,
  FloatingBarButton,
  RelativeTime,
  ScoreChip,
  SearchInput,
  SectionTabs,
  StackedCell,
  StatRow,
  StatusDot,
  TopBarContent,
  Waveform,
  useTableSort,
  type Column,
} from "@/components/admin/ui";

// Shared furniture for the styleguide. Kept out of page.tsx so that file
// reads as a table of contents rather than a wall of layout.

const RULE = "border-[color:hsl(var(--ds-border))]";
const MUTED = "text-[color:hsl(var(--ds-muted-2))]";

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
    <section id={id} className={`mb-8 scroll-mt-20 border-t pt-6 ${RULE}`}>
      <h2 className="ds-h2 mb-1">{title}</h2>
      {note && <p className={`ds-small admin-measure mb-4 ${MUTED}`}>{note}</p>}
      <div className={note ? undefined : "mt-4"}>{children}</div>
    </section>
  );
}

/** Prints the token name beside whatever it produces. */
export function Token({ name }: { name: string }) {
  return <code className={`ds-mono-count ${MUTED}`}>{name}</code>;
}

function Spec({ children }: { children: React.ReactNode }) {
  return <div className={`ds-mono-kbd mt-1.5 ${MUTED}`}>{children}</div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className={`ds-small admin-measure mt-2 ${MUTED}`}>{children}</p>;
}

function Sub({ title, token, children }: { title: string; token?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="ds-body-strong mb-2 flex items-baseline gap-2">
        {title} {token && <Token name={token} />}
      </h3>
      {children}
    </div>
  );
}

export function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 border-b py-2.5 last:border-b-0 ${RULE}`}>
      <div className="w-64 shrink-0">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// --- Type ------------------------------------------------------------------

const TYPE_STYLES: { cls: string; spec: string; sample: string }[] = [
  { cls: "ds-h1", spec: "30 / 1.1 / 800 / -0.03em", sample: "Leads" },
  { cls: "ds-h2", spec: "22 / 1.15 / 800 / -0.02em", sample: "Why it scored" },
  { cls: "ds-stat", spec: "24 / 1 / 800 / -0.03em", sample: "128" },
  { cls: "ds-card-title", spec: "17 / 1.25 / 800 / -0.02em", sample: "Birdsong Dogfood interview" },
  { cls: "ds-body", spec: "14 / 1.5 / 400", sample: "Routing rules nobody has fully mapped since the person who built them left." },
  { cls: "ds-body-strong", spec: "14 / 1.5 / 700", sample: "Interview quality" },
  { cls: "ds-row-primary", spec: "15 / 1.3 / 700", sample: "Priya Raman" },
  { cls: "ds-transcript", spec: "15 / 1.55 / 400", sample: "We route by territory first, then by whoever is free." },
  { cls: "ds-control", spec: "13 / 1 / 700", sample: "Push to HubSpot" },
  { cls: "ds-small", spec: "13 / 1.45 / 400", sample: "Comma-separated." },
  { cls: "ds-caption", spec: "12 / 1.4 / 600", sample: "Meetings booked" },
  { cls: "ds-eyebrow", spec: "11 / 1 / 700 / 0.06em, uppercase", sample: "Active studies" },
  { cls: "ds-mono-chip", spec: "mono 14 / 1 / 500", sample: "9" },
  { cls: "ds-mono-count", spec: "mono 12 / 1 / 400", sample: "12m ago" },
  { cls: "ds-mono-kbd", spec: "mono 11 / 1 / 400", sample: "⌘K" },
  { cls: "ds-mono-hero", spec: "mono 30 / 1 / 400", sample: "9" },
];

const LEGACY_ROLES = [
  "type-eyebrow",
  "type-page-title",
  "type-subhead",
  "type-section-label",
  "type-table-head",
  "type-metric-value",
  "type-metric-label",
  "type-heading",
  "type-body",
  "type-body-sm",
  "type-meta",
  "type-code",
];

export function TypeScale() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        {TYPE_STYLES.map((style) => (
          <Row
            key={style.cls}
            label={
              <>
                <Token name={`.${style.cls}`} />
                <Spec>{style.spec}</Spec>
              </>
            }
          >
            <span className={style.cls}>{style.sample}</span>
          </Row>
        ))}
      </div>
      <Sub title="Older roles" token=".type-*">
        {LEGACY_ROLES.map((cls) => (
          <Row key={cls} label={<Token name={`.${cls}`} />}>
            <span className={cls}>Worth a call 128</span>
          </Row>
        ))}
        <Note>
          The roles the pages still reference, re-cut onto the same scale. They carry a colour; the
          ds styles do not. New work uses the ds styles.
        </Note>
      </Sub>
    </div>
  );
}

// --- Color -----------------------------------------------------------------

type Swatch = { token: string; hex: string; use: string };

const COLOR_GROUPS: { heading: string; swatches: Swatch[] }[] = [
  {
    heading: "Grounds",
    swatches: [
      { token: "--ds-bg", hex: "#ffffff", use: "Pages and cards" },
      { token: "--ds-bg-sidebar", hex: "#f8fafc", use: "Sidebar, table headers, tinted panels" },
      { token: "--ds-bg-track", hex: "#f1f5f9", use: "Segmented track, fit chip, progress track" },
    ],
  },
  {
    heading: "Hairlines",
    swatches: [
      { token: "--ds-border", hex: "#e2e8f0", use: "Every hairline" },
      { token: "--ds-border-dashed", hex: "#cbd5e1", use: "Dashed borders only" },
    ],
  },
  {
    heading: "Text",
    swatches: [
      { token: "--ds-ink", hex: "#0f172a", use: "Primary text, the ink ground" },
      { token: "--ds-ink-2", hex: "#1e293b", use: "Quotes and transcripts" },
      { token: "--ds-ink-3", hex: "#334155", use: "Secondary cells, secondary buttons" },
      { token: "--ds-muted", hex: "#475569", use: "Inactive nav, dashed buttons" },
      { token: "--ds-muted-2", hex: "#64748b", use: "Labels, second lines. Lightest at 12px" },
      { token: "--ds-muted-3", hex: "#94a3b8", use: "Placeholders and hints only" },
    ],
  },
  {
    heading: "Accent",
    swatches: [
      { token: "--ds-accent", hex: "#0f766e", use: "The one accent" },
      { token: "--ds-accent-weak", hex: "#ddf3ef", use: "Tinted ground for accent text" },
      { token: "--ds-accent-bright", hex: "#5eead4", use: "Only on ink grounds" },
      { token: "--ds-accent-soft", hex: "#99e6da", use: "Second segment of a stacked bar" },
    ],
  },
  {
    heading: "Status",
    swatches: [
      { token: "--ds-status-new", hex: "#4f46e5", use: "New dot" },
      { token: "--ds-status-new-bg", hex: "#eef2ff", use: "New badge ground" },
      { token: "--ds-status-new-text", hex: "#3730a3", use: "New badge text" },
      { token: "--ds-warn", hex: "#d97706", use: "Meeting dot, underperforming bar" },
      { token: "--ds-warn-bg", hex: "#fffbeb", use: "Warn callout ground" },
      { token: "--ds-warn-border", hex: "#fde68a", use: "Warn callout border" },
      { token: "--ds-warn-text", hex: "#92400e", use: "Warn callout text" },
      { token: "--ds-warn-bg-badge", hex: "#fef3c7", use: "Meeting badge ground" },
      { token: "--ds-danger", hex: "#dc2626", use: "A dot, never a fill" },
    ],
  },
  {
    heading: "On ink",
    swatches: [
      { token: "--ds-on-ink", hex: "#ffffff", use: "Text on ink and accent" },
      { token: "--ds-on-ink-muted", hex: "#94a3b8", use: "Secondary text on ink" },
    ],
  },
];

const ALIASES: [string, string][] = [
  ["--ds-accent-text", "--ds-accent"],
  ["--ds-accent-live", "--ds-accent"],
  ["--ds-focus", "--ds-accent"],
  ["--ds-cover-1", "--ds-accent-weak"],
  ["--ds-cover-2", "--ds-bg-track"],
  ["--ds-cover-3", "--ds-bg-sidebar"],
  ["--ds-page-background, --ds-card, --ds-popover", "--ds-bg"],
  ["--ds-foreground, --ds-card-foreground", "--ds-ink"],
  ["--ds-muted-foreground", "--ds-muted-2"],
  ["--ds-faint", "--ds-muted-3"],
  ["--ds-chip, --ds-secondary", "--ds-bg-track"],
  ["--ds-surface", "--ds-bg-sidebar"],
  ["--ds-input", "--ds-border"],
  ["--ds-primary", "--ds-ink"],
  ["--ds-destructive", "--ds-danger"],
  ["--ds-success", "--ds-accent"],
  ["--ds-warning", "--ds-warn"],
  ["--ds-indigo", "--ds-status-new"],
];

export function Colors() {
  return (
    <div className="flex flex-col gap-5">
      {COLOR_GROUPS.map((group) => (
        <div key={group.heading}>
          <h3 className="ds-body-strong mb-2">{group.heading}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.swatches.map((s) => (
              <div
                key={s.token}
                className={`flex items-center gap-3 rounded-[var(--ds-radius-card)] border p-3 ${RULE}`}
              >
                <div
                  className={`h-10 w-10 shrink-0 rounded-[var(--ds-radius-control)] border ${RULE}`}
                  style={{ background: `hsl(var(${s.token}))` }}
                />
                <div className="min-w-0">
                  <Token name={s.token} />
                  <Spec>{s.hex}</Spec>
                  <div className={`ds-small mt-0.5 ${MUTED}`}>{s.use}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Sub title="Aliases" token="kept so nothing breaks">
        {ALIASES.map(([from, to]) => (
          <Row key={from} label={<Token name={from} />}>
            <Token name={to} />
          </Row>
        ))}
      </Sub>
    </div>
  );
}

// --- Buttons ---------------------------------------------------------------

export function Buttons() {
  const variants = ["primary", "secondary", "dashed", "ink", "ghost"] as const;
  const sizes = ["default", "sm"] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Variant / size", "Default", "Disabled", "With kbd"].map((h) => (
                <th key={h} className={`ds-caption h-9 px-3 text-left align-middle ${MUTED}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.flatMap((variant) =>
              sizes.map((size) => (
                <tr key={`${variant}-${size}`} className={`border-t ${RULE}`}>
                  <td className="px-3 py-2.5 align-middle">
                    <Token name={`${variant} / ${size}`} />
                    <Spec>{size === "default" ? "34px, radius control" : "30px, radius chip"}</Spec>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <Button variant={variant} size={size}>
                      Copy link
                    </Button>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <Button variant={variant} size={size} disabled>
                      Copy link
                    </Button>
                  </td>
                  <td className="px-3 py-2.5 align-middle">
                    <Button variant={variant} size={size} kbd="⌘C">
                      Copy link
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Note>
        Hover changes colour only. Tab through the table for the focus ring. The primary is the
        rightmost button in a bar and the only accent fill in it.
      </Note>
    </div>
  );
}

// --- Primitives ------------------------------------------------------------

type DemoLead = {
  id: string;
  name: string;
  title: string;
  company: string;
  study: string;
  score: number | null;
  fit: number | null;
  state: "new" | "contacted" | "meeting" | "hubspot";
  minutesAgo: number;
};

const DEMO_LEADS: DemoLead[] = [
  { id: "1", name: "Priya Raman", title: "Director, Demand Gen", company: "Loopwork", study: "Birdsong Dogfood interview", score: 9, fit: 8, state: "new", minutesAgo: 12 },
  { id: "2", name: "Elena Brooks", title: "Head of Growth", company: "Carbonpath", study: "Birdsong Dogfood interview", score: 8, fit: 9, state: "contacted", minutesAgo: 180 },
  { id: "3", name: "Jordan Pike", title: "VP Growth", company: "Meridian Ops", study: "Birdsong Dogfood interview", score: 9, fit: 9, state: "meeting", minutesAgo: 60 * 48 },
  { id: "4", name: "Grace Oyelaran", title: "Marketing Ops Lead, Platform and Lifecycle Programs", company: "Quillbase", study: "Birdsong Dogfood interview", score: 6, fit: 5, state: "hubspot", minutesAgo: 60 * 30 },
  { id: "5", name: "Ben Albright", title: "Director, Revenue Marketing", company: "Parcelwise", study: "Birdsong Dogfood interview", score: null, fit: null, state: "new", minutesAgo: 60 * 24 * 4 },
];

const when = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

const STACKED_COLUMNS: Column<DemoLead>[] = [
  { key: "name", header: "Respondent", width: 0.3, cell: (r) => <StackedCell primary={r.name} secondary={r.title} /> },
  { key: "company", header: "Company", width: 0.26, cell: (r) => <StackedCell primary={r.company} secondary={r.study} /> },
  { key: "score", header: "Score", width: "xs", sortable: true, sortValue: (r) => r.score, cell: (r) => <ScoreChip score={r.score} /> },
  { key: "fit", header: "Fit", width: "xs", cell: (r) => <ScoreChip score={r.fit} variant="fit" /> },
  { key: "status", header: "Status", width: "md", cell: (r) => <Badge state={r.state} /> },
  {
    key: "when",
    header: "Last activity",
    align: "right",
    width: "md",
    sortable: true,
    sortValue: (r) => -r.minutesAgo,
    cell: (r) => <RelativeTime date={when(r.minutesAgo)} align="right" className={`text-[12px] ${MUTED}`} />,
  },
];

const ONE_LINE_COLUMNS: Column<DemoLead>[] = [
  { key: "name", header: "Name", cell: (r) => <span className="font-bold text-[color:hsl(var(--ds-ink))]">{r.name}</span> },
  { key: "company", header: "Company", cell: (r) => r.company },
  { key: "score", header: "Score", width: "xs", cell: (r) => <ScoreChip score={r.score} /> },
  {
    key: "when",
    header: "Completed",
    align: "right",
    width: "md",
    cell: (r) => <RelativeTime date={when(r.minutesAgo)} align="right" className={`text-[12px] ${MUTED}`} />,
  },
];

function Tabs() {
  const [filter, setFilter] = useState<"all" | "unworked" | "mine" | "closed">("all");
  const [section, setSection] = useState<"responses" | "prospects" | "report">("responses");
  const [query, setQuery] = useState("");
  return (
    <div className="flex flex-col gap-6">
      <Sub title="FilterTabs" token="segmented">
        <FilterTabs
          label="Demo filter"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "all", label: "All", count: 7 },
            { value: "unworked", label: "Unworked", count: 4 },
            { value: "mine", label: "Mine", count: 2 },
            { value: "closed", label: "Closed", count: 0 },
          ]}
        />
        <Note>One either/or choice over a list. 30px tabs on the track; the active tab is white with the nav ring.</Note>
      </Sub>
      <Sub title="SectionTabs" token="page sections">
        <SectionTabs
          label="Demo sections"
          value={section}
          onChange={setSection}
          tabs={[
            { value: "responses", label: "Responses", count: 14 },
            { value: "prospects", label: "Prospects", count: 27 },
            { value: "report", label: "Report" },
          ]}
          trailing={<SearchInput value={query} onChange={setQuery} placeholder="Name, company" label="Demo search" className="w-[220px] flex-none" />}
        />
        <Note>42px on a hairline baseline; the active tab carries an inset 2px accent underline. Pass href on a tab for sections that are routes.</Note>
      </Sub>
    </div>
  );
}

function Searches() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchInput value={a} onChange={setA} placeholder="Name, email, company" label="Demo search" />
      <SearchInput value={b} onChange={setB} placeholder="Search or jump" label="Demo search with hint" hint="⌘K" />
    </div>
  );
}

function Tables() {
  const stacked = useTableSort(DEMO_LEADS, STACKED_COLUMNS, { key: "score", direction: "desc" });
  return (
    <div className="flex flex-col gap-6">
      <Sub title='density="stacked"' token="60px rows, 42px header">
        <DataTable
          columns={STACKED_COLUMNS}
          rows={stacked.rows}
          rowKey={(r) => r.id}
          rowHref={() => "#datatable"}
          density="stacked"
          layout="fixed"
          sort={stacked.sort}
          onSort={stacked.onSort}
          empty={{ title: "Nothing here." }}
        />
        <Note>
          StackedCell sets a 15px/700 primary over a 12px second line, both ellipsized. The whole
          row is a link; the fourth row shows the truncation. Unscored rows sort last.
        </Note>
      </Sub>
      <Sub title='density="default"' token="54px rows">
        <DataTable columns={ONE_LINE_COLUMNS} rows={DEMO_LEADS.slice(0, 3)} rowKey={(r) => r.id} empty={{ title: "Nothing here." }} />
      </Sub>
      <Sub title="empty" token="no rows">
        <DataTable columns={ONE_LINE_COLUMNS} rows={[]} rowKey={(r) => r.id} empty={{ title: "No leads match these filters." }} />
        <Note>No column headers and no frame around an empty table.</Note>
      </Sub>
    </div>
  );
}

export function Primitives() {
  return (
    <div className="flex flex-col gap-8">
      <Sub title="PageTopBar" token="crumbs, actions">
        <div className={`flex h-[56px] items-center rounded-[var(--ds-radius-card)] border px-8 ${RULE}`}>
          <TopBarContent
            crumbs={[{ label: "Projects", href: "#primitives" }, { label: "Birdsong Dogfood interview" }]}
            actions={
              <>
                <Button variant="secondary">Preview</Button>
                <Button variant="secondary">Report</Button>
                <Button>Copy link</Button>
              </>
            }
          />
        </div>
        <div className="mt-3">
          <Crumbs crumbs={[{ label: "Leads" }]} />
        </div>
        <Note>
          A page renders PageTopBar and its content lands in the shell&apos;s 56px bar. A page that
          renders none gets the breadcrumb for its route.
        </Note>
      </Sub>

      <Sub title="StatRow" token="label, value, emphasis, note">
        <StatRow
          stats={[
            { label: "Unworked", value: 4, emphasis: true, href: "#primitives" },
            { label: "Assigned to me", value: 2 },
            { label: "Contacted", value: 2 },
            { label: "Completion", value: "74%", note: "of 38" },
            { label: "Median time", value: "6m", delta: "+1m vs last week" },
          ]}
        />
        <Note>One joined bar. Two-word labels. emphasis turns one value accent; note sits after the value.</Note>
      </Sub>

      <Tabs />

      <Sub title="Badge" token="state">
        <div className="flex flex-wrap items-center gap-3">
          {BADGE_STATES.map((state) => (
            <Badge key={state} state={state} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {(["count", "accent", "live", "draft", "warning", "outline"] as const).map((v) => (
            <Badge key={v} variant={v}>
              {v}
            </Badge>
          ))}
          {(["count", "accent", "outline"] as const).map((v) => (
            <Badge key={`${v}-sm`} variant={v} size="sm">
              12
            </Badge>
          ))}
        </div>
        <Note>
          First row: the state table. A status passes a state key and gets its word, dot and ground.
          Second row: the older free-text variants, kept for counts and markers.
        </Note>
      </Sub>

      <Sub title="ScoreChip" token="score, fit, hero">
        <div className="flex flex-wrap items-center gap-3">
          {[10, 9, 8, 7, 6, 3, null].map((score) => (
            <ScoreChip key={String(score)} score={score} />
          ))}
          <span className={`ds-small ${MUTED}`}>score</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {[9, 7, 5, null].map((score) => (
            <ScoreChip key={String(score)} score={score} variant="fit" />
          ))}
          <span className={`ds-small ${MUTED}`}>fit, always neutral</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ScoreChip score={9} size="hero" />
          <ScoreChip score={8} size="hero" />
          <ScoreChip score={5} size="hero" />
          <ScoreChip score={8} size="sm" />
          <span className={`ds-small ${MUTED}`}>hero 56px, sm 28 by 24</span>
        </div>
      </Sub>

      <Sub title="SearchInput">
        <Searches />
      </Sub>

      <Sub title="Card">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <p className="ds-card-title mb-1">Default</p>
            <p className={`ds-small ${MUTED}`}>20px padding, 1px border, no shadow.</p>
          </Card>
          <Card padding="compact" interactive>
            <p className="ds-card-title mb-1">Compact, interactive</p>
            <p className={`ds-small ${MUTED}`}>16px padding. The ground tints on hover.</p>
          </Card>
          <Card header="Interview quality" headerAction={<a href="#primitives">Details</a>}>
            <p className={`ds-small ${MUTED}`}>A 44px header row on the sidebar ground.</p>
          </Card>
        </div>
      </Sub>

      <Sub title="StatusDot">
        <div className="ds-body flex flex-wrap items-center gap-6">
          <span className="inline-flex items-center gap-2">
            <StatusDot live /> live
          </span>
          <span className="inline-flex items-center gap-2">
            <StatusDot live pulse /> live, pulsing
          </span>
          <span className="inline-flex items-center gap-2">
            <StatusDot live={false} /> not live
          </span>
        </div>
      </Sub>

      <Sub title="Waveform" token="seed, bars, live, tone">
        <div className="flex flex-wrap items-center gap-6">
          <Waveform seed="study-a" />
          <Waveform seed="study-a" live />
          <Waveform seed="study-b" tone="muted" bars={16} />
          <span className="inline-flex items-center rounded-[var(--ds-radius-control)] bg-[color:hsl(var(--ds-ink))] px-4 py-3">
            <Waveform seed="study-a" tone="ink" live />
          </span>
          <Waveform seed="study-c" height={40} bars={32} />
        </div>
        <Note>The same seed always draws the same wave. It moves only while live.</Note>
      </Sub>

      <Sub title="FloatingBar">
        <div className={`relative h-[120px] rounded-[var(--ds-radius-card)] border border-dashed ${RULE.replace("--ds-border", "--ds-border-dashed")}`}>
          <FloatingBar label="2 selected">
            <FloatingBarButton>Assign to me</FloatingBarButton>
            <FloatingBarButton>Mark contacted</FloatingBarButton>
            <FloatingBarButton primary>Push to HubSpot</FloatingBarButton>
          </FloatingBar>
        </div>
        <Note>The one pill in admin. Exactly one primary. Not mounted on any page yet.</Note>
      </Sub>

      <Sub title="EmptyState">
        <EmptyState title="No completed interviews yet." action={<Button size="sm">New study</Button>} />
      </Sub>

      <Sub title="RelativeTime">
        <div className="flex flex-wrap items-center gap-6">
          {[14, 60 * 5, 60 * 24 * 3, 60 * 24 * 70].map((m) => (
            <RelativeTime key={m} date={when(m)} className={`text-[12px] ${MUTED}`} />
          ))}
        </div>
        <Note>Relative, in mono. The absolute stamp is the title attribute.</Note>
      </Sub>

      <Sub title="CollapsibleSection">
        <Card padding="flush">
          <div className="px-5">
            <CollapsibleSection
              title="Audience and goal"
              summary="RevOps leaders at 100 to 500 person B2B software companies who own lead routing."
              action={
                <Button variant="ghost" size="sm" className="px-0">
                  Edit
                </Button>
              }
            >
              <p className="admin-measure ds-body">Collapsed is the default. The summary is the point of the collapsed state.</p>
            </CollapsibleSection>
            <CollapsibleSection title="Questions" summary="6 questions, up to 1 follow-up each" defaultOpen>
              <p className="admin-measure ds-body">How is lead routing wired today?</p>
            </CollapsibleSection>
          </div>
        </Card>
      </Sub>
    </div>
  );
}

export function DataTableStates() {
  return <Tables />;
}

// --- Scales ----------------------------------------------------------------

const SPACING = [4, 8, 12, 16, 20, 24, 28, 32].map((px, i) => ({ token: `--ds-space-${i + 1}`, px }));

const GEOMETRY = [
  { token: "--ds-shell-sidebar", value: "240px", use: "Sidebar width" },
  { token: "--ds-shell-topbar", value: "56px", use: "Top bar height" },
  { token: "--ds-control-h", value: "34px", use: "Buttons and inputs in a bar" },
  { token: "--ds-row-h", value: "60px", use: "Two-line table row. 54 one-line, 42 header" },
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
              <Spec>{s.px}px</Spec>
            </>
          }
        >
          <div className="h-4 rounded-[4px] bg-[color:hsl(var(--ds-accent-weak))]" style={{ width: `var(${s.token})` }} />
        </Row>
      ))}
      {GEOMETRY.map((g) => (
        <Row
          key={g.token}
          label={
            <>
              <Token name={g.token} />
              <Spec>{g.value}</Spec>
            </>
          }
        >
          <span className={`ds-small ${MUTED}`}>{g.use}</span>
        </Row>
      ))}
    </div>
  );
}

const RADII = [
  { token: "--ds-radius-chip", label: "8px. Chips, badges, nav items" },
  { token: "--ds-radius-control", label: "10px. Buttons, inputs, the segmented track" },
  { token: "--ds-radius-card", label: "14px. Cards, tables, stat rows" },
  { token: "--ds-radius-hero", label: "18px. Home hero cards" },
  { token: "--ds-radius-pill", label: "999px. The floating bar only" },
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
              <Spec>{r.label}</Spec>
            </>
          }
        >
          <div className={`h-12 w-28 border bg-[color:hsl(var(--ds-bg-track))] ${RULE}`} style={{ borderRadius: `var(${r.token})` }} />
        </Row>
      ))}
    </div>
  );
}

const SHADOWS = [
  { token: "--ds-shadow-input", use: "The study launcher and chat inputs" },
  { token: "--ds-shadow-active-nav", use: "Active sidebar item, active segmented tab" },
  { token: "--ds-shadow-float", use: "The floating bar only" },
  { token: "--ds-shadow-card", use: "none. Cards take a border" },
];

export function Elevation() {
  return (
    <div className="flex flex-wrap gap-6 p-2">
      {SHADOWS.map((s) => (
        <div
          key={s.token}
          className="w-64 rounded-[var(--ds-radius-card)] bg-[color:hsl(var(--ds-bg))] p-5"
          style={{ boxShadow: `var(${s.token})` }}
        >
          <Token name={s.token} />
          <p className={`ds-small mt-1 ${MUTED}`}>{s.use}</p>
        </div>
      ))}
    </div>
  );
}

const TIMING = [
  { token: "--ds-ease-out", value: "cubic-bezier(0.2, 0.7, 0.2, 1)", use: "Every enter and grow" },
  { token: "--ds-duration-enter", value: "550ms", use: "Card fade-up, staggered 80ms" },
  { token: "--ds-duration-count", value: "900ms", use: "Number count-up, ring draw" },
  { token: "--ds-duration-wave", value: "1200ms", use: "Waveform loop while live" },
  { token: "--ds-duration-pulse", value: "1800ms", use: "Live dot pulse" },
];

export function Timing() {
  const [run, setRun] = useState(0);
  return (
    <div>
      {TIMING.map((t) => (
        <Row
          key={t.token}
          label={
            <>
              <Token name={t.token} />
              <Spec>{t.value}</Spec>
            </>
          }
        >
          <span className={`ds-small ${MUTED}`}>{t.use}</span>
        </Row>
      ))}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setRun((n) => n + 1)}>
          Replay enter
        </Button>
        {[0, 1, 2].map((i) => (
          <div
            key={`${run}-${i}`}
            className={`ds-enter ds-caption rounded-[var(--ds-radius-card)] border px-4 py-3 ${RULE}`}
            style={{ "--ds-enter-delay": `${i * 80}ms` } as React.CSSProperties}
          >
            Card {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FocusDemo() {
  return (
    <div className="flex flex-col gap-3">
      <p className={`ds-small admin-measure ${MUTED}`}>
        One rule for the whole surface: <Token name=".focus-ring" /> draws a 2px ring in{" "}
        <Token name="--ds-accent" /> at a 2px offset on :focus-visible. An outline is never removed
        without this replacing it.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button>Focusable button</Button>
        <a href="#focus" className="focus-ring ds-body rounded-[var(--ds-radius-chip)] px-2 py-1 underline">
          Focusable link
        </a>
        <input
          aria-label="Focusable input"
          placeholder="Focusable input"
          className={`focus-ring ds-small h-[34px] rounded-[var(--ds-radius-control)] border px-3 ${RULE}`}
        />
      </div>
    </div>
  );
}
