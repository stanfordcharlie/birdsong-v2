"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
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

// Rows that need attention first: someone mid-interview outranks the
// finished, sent and untouched ones, and within a status the newest is
// first. This is the order the "All" tab shows; the status tabs inherit it
// too, where it reduces to newest first.
const STATUS_ORDER: Record<string, number> = { started: 0, completed: 1, sent: 2, pending: 3 };

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

// Copy and open, side by side, on every row. This is the testing affordance
// the whole surface exists for: an operator needs to take one prospect's
// link and walk it end to end without touching the database or the export.
//
// Reset is the way back from that walk. A test click on a personal link
// creates a response and stamps the prospect as started, so the link then
// resumes the tester's abandoned session for the real person. Reset deletes
// that response and returns the row to pending, after a confirmation that
// names the prospect and says the transcript goes. It is refused for a
// completed interview, server-side as well as here: that is real data.
function RowLinkActions({ row }: { row: ProspectRow }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const displayName = row.name ?? row.email;
  const canReset = row.status !== "pending" && row.status !== "completed";

  async function handleReset() {
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch(`/api/prospects/${row.id}/reset`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't reset that prospect");
      setResetOpen(false);
      router.refresh();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Couldn't reset that prospect");
    } finally {
      setResetting(false);
    }
  }

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
    <div className="flex items-center justify-end gap-1 whitespace-nowrap">
      {canReset && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setResetOpen(true)}
          aria-label={`Reset ${displayName} to pending`}
        >
          Reset
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        aria-label={`Copy study link for ${displayName}`}
      >
        <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
      </Button>
      <Button variant="secondary" size="sm" asChild>
        <a
          href={row.link}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open study link for ${displayName} in a new tab`}
        >
          Open
        </a>
      </Button>

      <Dialog
        open={resetOpen}
        onClose={() => !resetting && setResetOpen(false)}
        title={`Reset ${displayName}?`}
        description={`Their interview transcript will be deleted and their link will start a fresh interview next time it is opened. The prospect record itself stays.`}
      >
        <div className="flex flex-col gap-3">
          {resetError && <p className="type-body text-destructive">{resetError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResetOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleReset} disabled={resetting}>
              {resetting ? "Resetting..." : "Delete transcript and reset"}
            </Button>
          </div>
        </div>
      </Dialog>
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

  const ordered = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [rows]
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ordered.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!needle) return true;
      // Name, email and company, as briefed. Title is deliberately not
      // searched: it is the noisiest column and matches everyone with
      // "Director" in it.
      return [row.name, row.email, row.company].some((field) =>
        field?.toLowerCase().includes(needle)
      );
    });
  }, [ordered, status, query]);

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

  // Widths are fractions that sum to 1, so the table uses the whole row
  // before any cell truncates; the fixed steps it used to mix in left a
  // third of the width idle while emails were cut short. Email gets the
  // most room, title the least (it is the noisiest column), and the
  // actions column is sized for three buttons on one line.
  // Every truncating column also carries `title`, which DataTable puts on
  // the cell as a native tooltip, so a long value is still one hover away.
  const columns: Column<ProspectRow>[] = [
    {
      key: "name",
      header: "Name",
      width: 0.17,
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
      width: 0.13,
      truncate: true,
      title: (row) => row.title ?? undefined,
      cell: (row) => row.title ?? EMPTY_VALUE,
    },
    {
      key: "company",
      header: "Company",
      width: 0.13,
      truncate: true,
      title: (row) => row.company ?? undefined,
      cell: (row) => row.company ?? EMPTY_VALUE,
    },
    {
      key: "email",
      header: "Email",
      width: 0.24,
      truncate: true,
      title: (row) => row.email,
      cell: (row) => row.email,
    },
    {
      key: "status",
      header: "Status",
      width: 0.08,
      cell: (row) => <Badge variant={STATUS_VARIANTS[row.status] ?? "count"}>{statusLabel(row.status)}</Badge>,
    },
    {
      key: "created",
      header: "Added",
      width: 0.09,
      sortable: true,
      sortValue: (row) => new Date(row.createdAt).getTime(),
      cell: (row) => (
        <span className="whitespace-nowrap">
          <RelativeTime date={row.createdAt} />
        </span>
      ),
    },
    {
      key: "link",
      header: <span className="sr-only">Study link</span>,
      align: "right",
      width: 0.16,
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
