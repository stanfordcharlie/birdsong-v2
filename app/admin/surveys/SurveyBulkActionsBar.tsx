"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import type { SurveyListItem } from "./SurveysList";

const DELETE_CONFIRM_WORD = "DELETE";

// Bar that appears above the table once one or more rows are checked.
// Archive/unarchive only render when the selection is all one state or the
// other — a mixed selection (some already archived, some not) doesn't have
// a single unambiguous bulk action, so neither button renders for it rather
// than guessing. Delete permanently always renders once something's
// selected, but is disabled (with a tooltip) unless every selected survey
// has zero responses — same underlying rule as the single-row menu's gate,
// just surfaced as disabled-with-explanation instead of hidden, since for a
// multi-item selection "why isn't this here" is a worse experience than
// "why is this greyed out." The API re-checks the zero-responses rule per
// survey regardless; this is presentation only.
export function SurveyBulkActionsBar({
  selected,
  onDone,
}: {
  selected: SurveyListItem[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selected.length;
  const allArchived = selected.every((s) => s.archivedAt !== null);
  const allActive = selected.every((s) => s.archivedAt === null);
  const canDeleteAll = selected.every((s) => s.responseCount === 0);

  async function runBulk(action: "archive" | "unarchive" | "delete") {
    setPending(true);
    setError(null);
    const results = await Promise.all(
      selected.map(async (survey) => {
        const res = await fetch(`/api/surveys/${survey.id}`, {
          method: action === "delete" ? "DELETE" : "PATCH",
          headers: action === "delete" ? undefined : { "Content-Type": "application/json" },
          body: action === "delete" ? undefined : JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return { ok: false, title: survey.title, error: body.error as string | undefined };
        }
        return { ok: true, title: survey.title };
      })
    );

    const failures = results.filter((r) => !r.ok);
    setPending(false);

    if (failures.length > 0) {
      setError(
        failures.length === results.length
          ? failures[0].error || "That didn't work."
          : `${results.length - failures.length} of ${results.length} succeeded. Failed: ${failures
              .map((f) => f.title)
              .join(", ")}`
      );
      router.refresh();
      return;
    }

    setArchiveDialogOpen(false);
    setDeleteDialogOpen(false);
    onDone();
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-card border border-primary/30 bg-primary/[0.06] px-4 py-2.5">
        <span className="text-sm font-medium text-card-foreground">
          {count} survey{count === 1 ? "" : "s"} selected
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Editing is inherently per-survey (there's no single form for
              settings across multiple surveys at once), so this only shows
              up when the selection is exactly one row — a shortcut to that
              row's detail page, same destination as clicking it directly. */}
          {count === 1 && (
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href={`/admin/surveys/${selected[0].id}`}>Edit</Link>
            </Button>
          )}
          {allActive && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null);
                setArchiveDialogOpen(true);
              }}
              disabled={pending}
            >
              Archive
            </Button>
          )}
          {allArchived && (
            <Button type="button" variant="secondary" size="sm" onClick={() => runBulk("unarchive")} disabled={pending}>
              {pending ? "Unarchiving..." : "Unarchive"}
            </Button>
          )}
          {/* Span carries the tooltip, not the button: a disabled button
              doesn't receive hover/mouse events in most browsers, so a
              title set directly on it would never actually show. */}
          <span title={canDeleteAll ? undefined : "Some selected surveys have responses; archive instead."}>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setError(null);
                setConfirmText("");
                setDeleteDialogOpen(true);
              }}
              disabled={pending || !canDeleteAll}
            >
              Delete permanently
            </Button>
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog
        open={archiveDialogOpen}
        onClose={() => !pending && setArchiveDialogOpen(false)}
        title={`Archive ${count} survey${count === 1 ? "" : "s"}?`}
        description="They'll be hidden from your default surveys list and stop accepting new responses. Existing responses stay exactly where they are, and you can unarchive any time."
      >
        <div className="flex flex-col gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setArchiveDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={() => runBulk("archive")} disabled={pending}>
              {pending ? "Archiving..." : "Archive"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !pending && setDeleteDialogOpen(false)}
        title={`Delete ${count} survey${count === 1 ? "" : "s"} permanently?`}
        description={`This can't be undone: ${selected.map((s) => s.title).join(", ")}. Type ${DELETE_CONFIRM_WORD} to confirm.`}
      >
        <div className="flex flex-col gap-3">
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={DELETE_CONFIRM_WORD}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setDeleteDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => runBulk("delete")}
              disabled={pending || confirmText !== DELETE_CONFIRM_WORD}
            >
              {pending ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
