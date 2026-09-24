import Link from "next/link";
import { Button, DataTable, EmptyState, RelativeTime, type Column } from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";
import { ProspectSequenceCell, ProspectStatusBadge } from "./prospects/cells";

// A glance at outreach from the study page: the counts and the five most
// recently active prospects, with the same status badge and sequence cell
// the roster draws. Everything else (import, search, reset, delete) lives
// on the roster page behind "View all".

export type ProspectPreviewRow = {
  id: string;
  name: string | null;
  company: string | null;
  status: string;
  instantlyRemovedAt: string | null;
  instantlyError: string | null;
  /** completed_at, else started_at, else created_at. */
  lastActivity: string;
};

export type ProspectsPreviewData = {
  total: number;
  counts: { pending: number; started: number; completed: number; removed: number };
  /** Up to five, most recently active first. */
  rows: ProspectPreviewRow[];
};

const COLUMNS: Column<ProspectPreviewRow>[] = [
  {
    key: "name",
    header: "Name",
    width: 0.5,
    truncate: true,
    rowLabel: true,
    title: (row) => row.name ?? undefined,
    cell: (row) => row.name ?? EMPTY_VALUE,
  },
  {
    key: "company",
    header: "Company",
    width: 0.5,
    truncate: true,
    title: (row) => row.company ?? undefined,
    cell: (row) => row.company ?? EMPTY_VALUE,
  },
  {
    key: "status",
    header: "Status",
    width: "md",
    cell: (row) => <ProspectStatusBadge status={row.status} />,
  },
  {
    key: "sequence",
    header: "Sequence",
    width: "md",
    truncate: true,
    title: (row) => row.instantlyError ?? undefined,
    cell: (row) => <ProspectSequenceCell removedAt={row.instantlyRemovedAt} error={row.instantlyError} />,
  },
  {
    key: "activity",
    header: "Last activity",
    width: "md",
    cell: (row) => (
      <span className="whitespace-nowrap">
        <RelativeTime date={row.lastActivity} />
      </span>
    ),
  },
];

export function ProspectsPreview({ surveyId, data }: { surveyId: string; data: ProspectsPreviewData }) {
  const href = `/admin/projects/${surveyId}/prospects`;
  const counts: Array<[string, number]> = [
    ["Pending", data.counts.pending],
    ["Started", data.counts.started],
    ["Completed", data.counts.completed],
    ["Removed from sequence", data.counts.removed],
  ];

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-eyebrow">Prospects</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href={href}>View all</Link>
        </Button>
      </div>

      {data.total === 0 ? (
        <EmptyState
          title="No prospects on this study yet."
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link href={href}>Import a CSV</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* The same label-and-count pair the filter tabs draw, without
              the tabs: this is a glance, not a filter. */}
          <p className="type-meta mb-3 flex flex-wrap gap-x-4 gap-y-1">
            {counts.map(([label, count]) => (
              <span key={label} className="flex items-center gap-1.5">
                {label}
                <span className="text-count text-muted-foreground">{count}</span>
              </span>
            ))}
          </p>
          <DataTable
            columns={COLUMNS}
            rows={data.rows}
            rowKey={(row) => row.id}
            layout="fixed"
            density="compact"
            empty={{ title: "No prospects on this study yet." }}
          />
        </>
      )}
    </section>
  );
}
