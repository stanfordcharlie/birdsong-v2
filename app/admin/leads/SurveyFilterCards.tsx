"use client";

import { StatusDot } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

// The survey selector for the lead queue (design reference: AdminLeads.dc.html
// — "Survey selection is now a row of clickable survey cards above the queue").
// Replaces the toolbar's `All surveys` <select>: a dropdown hides both how many
// leads each survey produced and how many of them are still waiting on someone,
// which is the whole question this page exists to answer.
//
// Each card carries four readings, in the order the eye wants them:
//   live dot   — is this survey still collecting, or is it finished/draft
//   lead count — how many completed interviews it has produced in total
//   worth-a-call — of those, how many scored 7+ and nobody has replied to yet
//   share meter — this survey's share of every lead in the queue
//
// "All surveys" is the same card with the totals in it, so clearing the filter
// is one click on the same row rather than a separate control.

export type SurveyCard = {
  /** null on the "All surveys" card. */
  id: string | null;
  title: string;
  leadCount: number;
  worthACall: number;
  /** 0-1, this survey's share of every lead in the queue. */
  share: number;
  isLive: boolean;
};

export function SurveyFilterCards({
  cards,
  selectedId,
  onSelect,
}: {
  cards: SurveyCard[];
  /** null = the "All surveys" card is selected. */
  selectedId: string | null;
  onSelect: (surveyId: string | null) => void;
}) {
  return (
    // Scrolls rather than wraps: an account with nine surveys would otherwise
    // push the queue itself below the fold. -mx/px padding so the focus ring
    // on the first and last card isn't clipped by the scroll container.
    <div
      className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1"
      role="group"
      aria-label="Filter the queue by survey"
    >
      {cards.map((card) => {
        const selected = card.id === selectedId;
        return (
          <button
            key={card.id ?? "all"}
            type="button"
            onClick={() => onSelect(card.id)}
            aria-pressed={selected}
            className={cn(
              "focus-ring flex min-w-[212px] flex-1 flex-col rounded-card border bg-card px-4 pb-3.5 pt-3 text-left transition-colors",
              selected
                ? // The ink ring is the selected state. It sits inside the box
                  // (`ring-inset`) so selecting a card never nudges its
                  // neighbours by the ring's width.
                  "border-primary ring-1 ring-inset ring-primary"
                : "border-border hover:bg-secondary"
            )}
          >
            <div className="flex items-center gap-2">
              <StatusDot live={card.isLive} />
              <span className="type-body-sm truncate font-semibold">
                {card.title}
              </span>
              <span className="type-body-sm ml-auto shrink-0 text-muted-foreground">
                {card.leadCount}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              {/* Archivo, not a serif: DESIGN.md keeps the display face to the
                  one page title per page. */}
              <span
                className={cn(
                  "type-metric-value",
                  selected ? "text-brand" : card.worthACall === 0 ? "text-faint" : "text-card-foreground"
                )}
              >
                {card.worthACall}
              </span>
              <span className="type-metric-label">worth a call</span>
            </div>

            <div className="mt-3 h-[5px] overflow-hidden rounded-pill bg-chip">
              <div
                className={cn("h-full rounded-pill", selected ? "bg-brand" : "bg-faint")}
                style={{ width: `${Math.round(card.share * 100)}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
