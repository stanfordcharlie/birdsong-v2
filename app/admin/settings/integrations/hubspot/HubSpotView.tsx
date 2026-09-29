import Link from "next/link";
import {
  BIRDSONG_CONTACT_PROPERTIES,
  BIRDSONG_PIPELINE_LABEL,
  BIRDSONG_PIPELINE_STAGES,
  BIRDSONG_PROPERTY_GROUP,
  HUBSPOT_DEAL_SCORE_MIN,
} from "@/lib/hubspot";
import { Card, DataTable, RelativeTime, SectionTabs, type Column } from "@/components/admin/ui";
import { bg, border, radius, text } from "@/components/admin/ui/tokens";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LogoTile } from "../_components/logos";
import { StatusPill } from "../_components/StatusPill";

export type Tab = "overview" | "mapping";

// The Birdsong names for the properties the sync provisions, keyed by the
// HubSpot internal name. A property added to the list in lib/hubspot.ts
// without a name here falls back to its HubSpot label rather than going
// missing from the table.
const FIELD_NAMES: Record<string, string> = {
  birdsong_lead_score: "Lead score",
  birdsong_survey: "Study",
  birdsong_pain_points: "Pain points",
  birdsong_response_url: "Response link",
  birdsong_interview_date: "Interview date",
  birdsong_call_script: "Call script",
};

type MappingRow = {
  key: string;
  field: string;
  property: string;
  internalName: string;
  object: "Contact" | "Deal";
};

// Read straight from what the sync provisions: the custom contact
// properties, then the deal pipeline it creates deals in.
const MAPPING_ROWS: MappingRow[] = [
  ...BIRDSONG_CONTACT_PROPERTIES.map((property) => ({
    key: property.name,
    field: FIELD_NAMES[property.name] ?? property.label,
    property: property.label,
    internalName: property.name,
    object: "Contact" as const,
  })),
  {
    key: "pipeline",
    field: "Lead pipeline",
    property: BIRDSONG_PIPELINE_LABEL,
    internalName: "pipeline",
    object: "Deal",
  },
];

const MAPPING_COLUMNS: Column<MappingRow>[] = [
  {
    key: "field",
    header: "Birdsong field",
    rowLabel: true,
    cell: (row) => <span className={cn("font-semibold", text.ink)}>{row.field}</span>,
  },
  {
    key: "property",
    header: "HubSpot property",
    cell: (row) => (
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span>{row.property}</span>
        <span className={cn("ds-mono-count", text.muted2)}>({row.internalName})</span>
      </span>
    ),
  },
  {
    key: "object",
    header: "Object",
    cell: (row) => row.object,
  },
];

type StageRow = { label: string; probability: string; isClosed: boolean };

const STAGE_COLUMNS: Column<StageRow>[] = [
  { key: "stage", header: "Stage", rowLabel: true, cell: (row) => <span className={cn("font-semibold", text.ink)}>{row.label}</span> },
  {
    key: "probability",
    header: "Win probability",
    align: "right",
    cell: (row) => <span className="ds-mono-count">{Math.round(Number(row.probability) * 100)}%</span>,
  },
  { key: "closed", header: "Closed", cell: (row) => (row.isClosed ? "Yes" : "No") },
];

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px]">
      <span className={cn("text-[12px]", text.muted2)}>{label}</span>
      <span className={cn("text-[13px] font-semibold leading-[1.45]", text.ink)}>{children}</span>
    </div>
  );
}

function NotChecked() {
  return <span className={cn("font-medium", text.muted2)}>Not checked</span>;
}

type ChecklistState = "done" | "todo" | "unknown";

function ChecklistRow({
  label,
  detail,
  state,
  href,
}: {
  label: string;
  detail: React.ReactNode;
  state: ChecklistState;
  href?: string;
}) {
  const mark =
    state === "done" ? (
      <span
        aria-hidden
        className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full", bg.accent, text.onInk)}
      >
        <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      </span>
    ) : (
      <span
        aria-hidden
        className={cn("h-[18px] w-[18px] shrink-0 rounded-full border", state === "todo" ? border.base : cn("border-dashed", border.dashed))}
      />
    );
  const body = (
    <>
      {mark}
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className={cn("text-[13px] font-bold", text.ink)}>
          {label}
          <span className="sr-only">
            {state === "done" ? ", done" : state === "todo" ? ", not done" : ", not checked"}
          </span>
        </span>
        <span className={cn("text-[12px] leading-[1.4]", text.muted2)}>{detail}</span>
      </span>
      {href && (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn("shrink-0", text.muted3)}
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </>
  );
  const classes = cn("flex items-center gap-3 border-t px-5 py-[12px] first:border-t-0", border.base);
  return href ? (
    <Link href={href} className={cn(classes, "focus-ring transition-colors hover:bg-[color:hsl(var(--ds-bg-sidebar))]")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

export type HubSpotViewProps = {
  tab: Tab;
  connected: boolean;
  /** Responses this org has pushed, from the sync's own bookkeeping. */
  pushedCount: number;
  /** The earliest successful push, or null before the first. */
  firstPushedAt: string | null;
};

/** The HubSpot detail page, given its facts. The page reads them. */
export function HubSpotView({ tab, connected, pushedCount, firstPushedAt }: HubSpotViewProps) {
  const base = "/admin/settings/integrations/hubspot";
  const propertyCount = BIRDSONG_CONTACT_PROPERTIES.length;

  return (
    <div className="flex flex-col gap-[22px]">
      <Link
        href="/admin/settings/integrations"
        className={cn("focus-ring inline-flex w-fit items-center gap-1 text-[13px] font-semibold", radius.chip, text.muted, "hover:text-[color:hsl(var(--ds-ink))]")}
      >
        <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Integrations
      </Link>

      <header className="flex items-center gap-[14px]">
        <LogoTile vendor="hubspot" size={40} />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className={cn("text-[26px] font-extrabold leading-[1.15] tracking-[-0.03em]", text.ink)}>HubSpot</h1>
            <StatusPill status={connected ? "connected" : "disconnected"} />
          </div>
          <p className={cn("text-[13px]", text.muted2)}>
            Portal ID <span className={text.muted3}>Not stored</span>
          </p>
        </div>
      </header>

      <SectionTabs<Tab>
        label="HubSpot sections"
        value={tab}
        tabs={[
          { value: "overview", label: "Overview", href: base },
          { value: "mapping", label: "Field mapping", count: MAPPING_ROWS.length, href: `${base}?tab=mapping` },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {tab === "overview" ? (
            <>
              <Card header="Connection" padding="flush">
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                  <Detail label="Portal ID">
                    <span className={cn("font-medium", text.muted2)}>Not stored</span>
                  </Detail>
                  <Detail label="Connected">
                    {connected ? (
                      <>
                        Yes, by a server access token
                        <span className={cn("block font-medium", text.muted2)}>Date not stored</span>
                      </>
                    ) : (
                      "No access token is set on the server"
                    )}
                  </Detail>
                  <Detail label="Pipeline">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      {BIRDSONG_PIPELINE_LABEL}
                      <NotChecked />
                    </span>
                  </Detail>
                  <Detail label="Push">Manual, from each lead or the Leads queue</Detail>
                  <Detail label="Deals">
                    Opened for leads scoring <span className="ds-mono-count">{HUBSPOT_DEAL_SCORE_MIN}</span> or higher
                  </Detail>
                  <Detail label="Pushed so far">
                    <span className="ds-mono-count">{pushedCount}</span>{" "}
                    {pushedCount === 1 ? "lead" : "leads"}
                  </Detail>
                </div>
              </Card>

              <Card header="How a push works">
                <ol className={cn("flex list-decimal flex-col gap-2 pl-5 text-[13px] leading-[1.5]", text.ink3)}>
                  <li>The contact is matched by email and updated, or created when there is no match.</li>
                  <li>
                    The {propertyCount} Birdsong properties are written under the{" "}
                    <span className={cn("font-semibold", text.ink)}>{BIRDSONG_PROPERTY_GROUP.label}</span> group.
                  </li>
                  <li>
                    A lead at <span className="ds-mono-count">{HUBSPOT_DEAL_SCORE_MIN}</span> or above also opens a deal in{" "}
                    <span className={cn("font-semibold", text.ink)}>{BIRDSONG_PIPELINE_LABEL}</span>.
                  </li>
                  <li>Nothing is deleted or blanked. A missing value leaves the HubSpot field as it was.</li>
                </ol>
              </Card>
            </>
          ) : (
            <>
              <DataTable
                columns={MAPPING_COLUMNS}
                rows={MAPPING_ROWS}
                rowKey={(row) => row.key}
                gridTemplate="minmax(0,1fr) minmax(0,1.6fr) 96px"
                stickyHeader={false}
                empty={{ title: "No fields are mapped." }}
              />
              <div className="flex flex-col gap-3">
                <h2 className={cn("ds-eyebrow", text.muted3)}>Deal stages in {BIRDSONG_PIPELINE_LABEL}</h2>
                <DataTable
                  columns={STAGE_COLUMNS}
                  rows={BIRDSONG_PIPELINE_STAGES}
                  rowKey={(row) => row.label}
                  gridTemplate="minmax(0,1fr) 128px 96px"
                  stickyHeader={false}
                  empty={{ title: "No stages are defined." }}
                />
                <p className={cn("text-[12px] leading-[1.45]", text.muted2)}>
                  Stages are created once, when the pipeline is. A pipeline someone has since renamed or reordered is left as it is.
                </p>
              </div>
            </>
          )}
        </div>

        <Card header="Setup checklist" padding="flush">
          <ChecklistRow
            label="Connected"
            state={connected ? "done" : "todo"}
            detail={connected ? "Access token is set" : "Set the access token on the server"}
          />
          <ChecklistRow
            label="Custom properties created"
            state="unknown"
            detail={
              <>
                <span className="ds-mono-count">{propertyCount}</span> defined. Not checked
              </>
            }
            href={`${base}?tab=mapping`}
          />
          <ChecklistRow
            label={`${BIRDSONG_PIPELINE_LABEL} pipeline`}
            state="unknown"
            detail="Not checked"
            href={`${base}?tab=mapping`}
          />
          <ChecklistRow
            label="First lead pushed"
            state={pushedCount > 0 ? "done" : "todo"}
            detail={
              firstPushedAt ? (
                <>
                  <RelativeTime date={firstPushedAt} className="ds-mono-count" />, {formatDate(firstPushedAt)}
                </>
              ) : (
                "Push a lead from its page or the Leads queue"
              )
            }
            href="/admin/leads"
          />
        </Card>
      </div>
    </div>
  );
}
