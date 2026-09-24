"use client";

import { useId, useState } from "react";
import { Card } from "@/components/admin/ui";
import { ScoreRing } from "./ScoreRing";

// The first card on the response detail page: the two scores on the left,
// the one-line verdict on the right, and the rest of the summary a click
// away. A rep reads the headline in the second before dialling; the full
// paragraph is there for the one call in five where the headline is not
// enough.

export function SummaryCard({
  leadScore,
  fitScore,
  fitNote,
  headline,
  detail,
}: {
  leadScore: number | null;
  /** Null when fit research was unavailable or has not run. */
  fitScore: number | null;
  /** The qualifier under the fit ring: "low confidence", "research unavailable". */
  fitNote: string | null;
  /** The first sentence of the summary. Null when nothing was written. */
  headline: string | null;
  /** Every paragraph after the headline, in reading order. */
  detail: string[];
}) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const hasDetail = detail.length > 0;

  return (
    <Card className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1px_1fr] md:gap-8">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4 self-center">
        <ScoreRing score={leadScore} label="Lead score" />
        <ScoreRing score={fitScore} label="Company fit" note={fitNote} />
      </div>

      <div aria-hidden className="hidden bg-border md:block" />

      <div className="flex min-w-0 flex-col gap-3">
        {headline ? (
          <p className="font-serif text-[26px] leading-[1.3] tracking-[-0.01em] text-card-foreground">
            {headline}
          </p>
        ) : (
          <p className="type-body text-muted-foreground">No summary yet.</p>
        )}

        {hasDetail && (
          <>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailId}
              onClick={() => setOpen((previous) => !previous)}
              className="focus-ring self-start rounded-control font-archivo text-[14px] font-medium text-brand underline-offset-2 hover:underline"
            >
              {open ? "Hide summary" : "Read summary"}
            </button>
            {open && (
              <div id={detailId} className="flex flex-col gap-2">
                {detail.map((paragraph, i) => (
                  <p key={i} className={i === 0 ? "type-body" : "type-body text-muted-foreground"}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
