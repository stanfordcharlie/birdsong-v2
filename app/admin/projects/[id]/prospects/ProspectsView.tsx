"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterTabs,
  PageHeader,
  PageShell,
  RelativeTime,
  SearchInput,
  StatRow,
  type AdminBadgeProps,
  type Column,
  type FilterTab,
} from "@/components/admin/ui";
import { EMPTY_VALUE } from "@/lib/format";
import type { ImportResult } from "@/app/api/prospects/import/route";

export type ProspectRow = {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  email: string;
  status: string;
  createdAt: string;
  /** The absolute tokenized survey URL, built server-side. */
  link: string;
};

// The five states a prospect moves through. Ordered as the funnel runs, so
// the filter tabs and the stat row read left to right in the same order.
const STATUSES = ["pending", "sent", "started", "completed"] as const;
type StatusFilter = "all" | (typeof STATUSES)[number];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  sent: "Sent",
  started: "Started",
  completed: "Completed",
};

// Existing Badge variants only. Nothing new is invented for a fifth state:
// the funnel gets flatter as it goes, so the two ends are the two that carry
// colour and the middle stays neutral.
const STATUS_VARIANTS: Record<string, AdminBadgeProps["variant"]> = {
  pending: "draft",
  sent: "outline",
  started: "accent",
  completed: "live",
};

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

// Copy and open, side by side, on every row. This is the testing affordance
// the whole surface exists for: an operator needs to take one prospect's
// link and walk it end to end without touching the database or the export.
function RowLinkActions({ row }: { row: ProspectRow }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(row.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be refused (an insecure origin, a locked-down
      // browser). The link is still reachable through Open, so this stays
      // silent rather than raising an error about a convenience.
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        aria-label={`Copy study link for ${row.name ?? row.email}`}
      >
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </Button>
      <Button variant="secondary" size="sm" asChild>
        <a
          href={row.link}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open study link for ${row.name ?? row.email} in a new tab`}
        >
          Open
        </a>
      </Button>
    </div>
  );
}

export function ProspectsView({
  surveyId,
  surveyTitle,
  rows,
}: {
  surveyId: string;
  surveyTitle: string;
  rows: ProspectRow[];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const row of rows) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    return byStatus;
  }, [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      // Name, email and company, as briefed. Title is deliberately not
      // searched: it is the noisiest column and matches everyone with
      // "Director" in it.
      return [row.name, row.email, row.company].some((field) =>
        field?.toLowerCase().includes(needle)
      );
    });
  }, [rows, status, query]);

  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset immediately so choosing the same file twice in a row still fires
    // a change event, which is what a re-import after a fix needs.
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("survey_id", surveyId);
      const res = await fetch("/api/prospects/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That import did not go through");
      setResult(data as ImportResult);
      // The roster is server-rendered, so the new rows arrive with a reload
      // rather than by patching client state and hoping the two agree.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That import did not go through");
    } finally {
      setImporting(false);
    }
  }

  const importButton = (
    <Button
      type="button"
      variant={rows.length === 0 ? "primary" : "secondary"}
      onClick={() => fileInputRef.current?.click()}
      disabled={importing}
    >
      {importing ? "Importing" : "Import CSV"}
    </Button>
  );

  const tabs: FilterTab<StatusFilter>[] = [
    { value: "all", label: "All", count: rows.length },
    ...STATUSES.map((value) => ({
      value: value as StatusFilter,
      label: statusLabel(value),
      count: counts[value] ?? 0,
    })),
  ];

  const columns: Column<ProspectRow>[] = [
    {
      key: "name",
      header: "Name",
      width: 0.2,
      truncate: true,
      rowLabel: true,
      sortable: true,
      sortValue: (row) => row.name?.toLowerCase() ?? null,
      title: (row) => row.name ?? undefined,
      cell: (row) => row.name ?? EMPTY_VALUE,
    },
    {
      key: "title",
      header: "Title",
      width: 0.18,
      truncate: true,
      title: (row) => row.title ?? undefined,
      cell: (row) => row.title ?? EMPTY_VALUE,
    },
    {
      key: "company",
      header: "Company",
      width: 0.16,
      truncate: true,
      title: (row) => row.company ?? undefined,
      cell: (row) => row.company ?? EMPTY_VALUE,
    },
    {
      key: "email",
      header: "Email",
      width: 0.22,
      truncate: true,
      title: (row) => row.email,
      cell: (row) => row.email,
    },
    {
      key: "status",
      header: "Status",
      width: "md",
      cell: (row) => <Badge variant={STATUS_VARIANTS[row.status] ?? "count"}>{statusLabel(row.status)}</Badge>,
    },
    {
      key: "created",
      header: "Added",
      width: "md",
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
      cell: (row) => <RelativeTime date={row.createdAt} />,
    },
    {
      key: "link",
      header: <span className="sr-only">Study link</span>,
      align: "right",
      width: "lg",
      cell: (row) => <RowLinkActions row={row} />,
    },
  ];

  return (
    <PageShell>
      {/* Outside the conditional render below so the picker survives the
          switch between the empty state and the table. */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChosen}
        className="hidden"
      />

      <PageHeader
        eyebrow={
          <Link
            href={`/admin/projects/${surveyId}`}
            className="focus-ring rounded-control transition-colors hover:text-card-foreground"
          >
            {surveyTitle}
          </Link>
        }
        title="Prospects"
        meta={`${rows.length} ${rows.length === 1 ? "prospect" : "prospects"} on this study`}
        actions={
          <>
            {importButton}
            <Button variant="secondary" asChild>
              <a href={`/api/prospects/export?survey_id=${surveyId}`}>Export CSV</a>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-8">
        {/* Import feedback sits above the roster, where the thing it describes
            just changed. Counts, not a sentence, and the mapping underneath
            so a wrong guess is visible rather than inferred from bad data. */}
        {error && (
          <p className="type-body text-destructive" role="status">
            {error}
          </p>
        )}
        {result && (
          <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-4" role="status">
            <p className="type-body">
              {result.created} created, {result.skippedDuplicate} skipped as duplicates,{" "}
              {result.skippedInvalid} skipped as invalid
            </p>
            <p className="type-meta">
              Mapped:{" "}
              {Object.entries(result.mapping.fields)
                .map(([field, header]) => `${field} from "${header}"`)
                .join(", ") || "nothing"}
              {result.mapping.unmapped.length > 0 &&
                `. Kept in firmographics: ${result.mapping.unmapped.join(", ")}`}
            </p>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            title="No prospects on this study yet. Import an Apollo CSV to build the roster."
            action={importButton}
          />
        ) : (
          <>
            <StatRow
              stats={[
                { label: "Total", value: rows.length },
                ...STATUSES.map((value) => ({
                  label: statusLabel(value),
                  value: counts[value] ?? 0,
                })),
              ]}
            />

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <FilterTabs tabs={tabs} value={status} onChange={setStatus} label="Filter by status" />
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search name, email, company"
                  label="Search prospects"
                />
              </div>

              <DataTable
                columns={columns}
                rows={visible}
                rowKey={(row) => row.id}
                layout="fixed"
                empty={{ title: "No prospects match that filter." }}
              />
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
