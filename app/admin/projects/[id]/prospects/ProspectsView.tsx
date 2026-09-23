"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  StatusDot,
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
  /** When completion moved them out of their Instantly campaign. */
  instantlyRemovedAt: string | null;
  /** Why the last move attempt failed, when it did. */
  instantlyError: string | null;
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
//
// Deleting is not a row action. It is a selection: check rows, or the
// header box for everything the current filter shows, and the bar that
// appears above the table deletes them together. See ProspectsView.
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

// A native checkbox tinted with the primary colour. The admin kit has no
// checkbox primitive yet, and one input with accent-color is not worth
// forking one for: every evergreen browser themes it consistently enough.
function SelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // `indeterminate` is a DOM property, not an attribute, so it has to be set
  // imperatively. The header box uses it for "some of these rows".
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={label}
      className="focus-ring block h-4 w-4 cursor-pointer rounded accent-primary"
    />
  );
}

// The bar that replaces the filter row while something is checked. One
// count, one action, one way out. Delete runs one request per prospect
// against the same route a single delete would use, so the ownership check
// and the response rules are applied per row and a partial failure is
// reported as such rather than hidden behind an all-or-nothing message.
//
// The dialog does not ask for typed confirmation. Prospects are roster
// entries, not studies: what a delete can cost is one import row and,
// server-side, an unfinished test session. A finished interview survives it.
function SelectionBar({
  selected,
  onDone,
}: {
  selected: ProspectRow[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selected.length;
  const noun = count === 1 ? "prospect" : "prospects";
  const finished = selected.filter((row) => row.status === "completed").length;
  const inProgress = selected.filter((row) => row.status === "started").length;

  const description = [
    count === 1
      ? `${selected[0].name ?? selected[0].email} comes off the roster and their link stops working.`
      : `${count} prospects come off the roster and their links stop working.`,
    finished > 0 &&
      (finished === 1 ? "One finished interview stays in Leads." : `${finished} finished interviews stay in Leads.`),
    inProgress > 0 &&
      (inProgress === 1
        ? "One unfinished interview is deleted with them."
        : `${inProgress} unfinished interviews are deleted with them.`),
    "This cannot be undone.",
  ]
    .filter(Boolean)
    .join(" ");

  async function handleDelete() {
    setPending(true);
    setError(null);
    const results = await Promise.all(
      selected.map(async (row) => {
        const res = await fetch(`/api/prospects/${row.id}`, { method: "DELETE" });
        if (res.ok) return { ok: true as const, row };
        const body = await res.json().catch(() => ({}));
        return { ok: false as const, row, error: body.error as string | undefined };
      })
    );
    setPending(false);

    const failures = results.filter((result) => !result.ok);
    if (failures.length > 0) {
      setError(
        failures.length === results.length
          ? failures[0].error || "Couldn't delete those prospects"
          : `${results.length - failures.length} of ${results.length} deleted. Not deleted: ${failures
              .map((failure) => failure.row.name ?? failure.row.email)
              .join(", ")}`
      );
      // The rows that did go are gone; the roster should say so even while
      // the failures are still on screen.
      router.refresh();
      return;
    }

    setDialogOpen(false);
    onDone();
    router.refresh();
  }

  return (
    <>
      <div
        className="flex items-center gap-3 rounded-card border border-primary/30 bg-primary/[0.06] px-4 py-2.5"
        role="region"
        aria-label="Selected prospects"
      >
        <span className="type-body font-semibold text-card-foreground">
          {count} selected
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setError(null);
              setDialogOpen(true);
            }}
            disabled={pending}
            className="text-destructive"
          >
            Delete {count === 1 ? "" : count} {noun}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
      {error && (
        <p className="type-body text-destructive" role="status">
          {error}
        </p>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => !pending && setDialogOpen(false)}
        title={count === 1 ? `Delete ${selected[0].name ?? selected[0].email}?` : `Delete ${count} prospects?`}
        description={description}
      >
        <div className="flex flex-col gap-3">
          {error && <p className="type-body text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting..." : `Delete ${count === 1 ? "prospect" : `${count} prospects`}`}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
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
  // Ids, not rows: the roster is server-rendered and refreshes after every
  // mutation, so a held row object would go stale. Anything checked that is
  // no longer on the roster is dropped when `rows` changes.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
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

  useEffect(() => {
    setSelectedIds((current) => {
      const present = new Set(rows.map((row) => row.id));
      const next = new Set(Array.from(current).filter((id) => present.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rows]);

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.has(row.id)), [rows, selectedIds]);
  // The header box speaks for the rows on screen, not the whole roster: with
  // a filter or a search applied, "all" means all of these. Rows checked
  // under an earlier filter stay checked, and the count in the bar says so.
  const visibleSelectedCount = visible.filter((row) => selectedIds.has(row.id)).length;
  const allVisibleSelected = visible.length > 0 && visibleSelectedCount === visible.length;

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleVisible(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const row of visible) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

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
  // actions column is sized for three buttons on one line. The checkbox
  // column is the one fixed step in front of them.
  // Every truncating column also carries `title`, which DataTable puts on
  // the cell as a native tooltip, so a long value is still one hover away.
  const columns: Column<ProspectRow>[] = [
    {
      key: "select",
      header: (
        <SelectBox
          checked={allVisibleSelected}
          indeterminate={!allVisibleSelected && visibleSelectedCount > 0}
          onChange={toggleVisible}
          label={
            visible.length === rows.length
              ? "Select all prospects"
              : `Select all ${visible.length} prospects shown`
          }
        />
      ),
      width: "xxs",
      cell: (row) => (
        <SelectBox
          checked={selectedIds.has(row.id)}
          onChange={(checked) => toggleRow(row.id, checked)}
          label={`Select ${row.name ?? row.email}`}
        />
      ),
    },
    {
      key: "name",
      header: "Name",
      width: 0.15,
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
      width: 0.11,
      truncate: true,
      title: (row) => row.title ?? undefined,
      cell: (row) => row.title ?? EMPTY_VALUE,
    },
    {
      key: "company",
      header: "Company",
      width: 0.12,
      truncate: true,
      title: (row) => row.company ?? undefined,
      cell: (row) => row.company ?? EMPTY_VALUE,
    },
    {
      key: "email",
      header: "Email",
      width: 0.19,
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
    // What happened in Instantly at completion. Read-only: a dot and a word
    // when they were moved out of their campaign, the failure text (full
    // text on hover) when the move failed, nothing until then. Fixing a
    // failure is a manual job in Instantly, so there is no button here.
    {
      key: "instantly",
      header: "Sequence",
      width: 0.10,
      truncate: true,
      title: (row) => row.instantlyError ?? undefined,
      cell: (row) =>
        row.instantlyRemovedAt ? (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <StatusDot live />
            Removed
          </span>
        ) : row.instantlyError ? (
          <span className="text-destructive">{row.instantlyError}</span>
        ) : (
          EMPTY_VALUE
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

              {selectedRows.length > 0 && (
                <SelectionBar selected={selectedRows} onDone={() => setSelectedIds(new Set())} />
              )}

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
