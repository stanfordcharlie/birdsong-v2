"use client";

import { StatusDot } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

// The study selector for the lead queue: one chip per study above the
// queue, replacing a <select> that hid how many leads each study produced
// and how many are still waiting on someone. Each chip carries the live dot,
// the title, the lead count, and beneath it the worth-a-call count. The share
// meter this used to draw is gone: a bar under a count is a second reading
// of the count.
//
// "All studies" is the same chip with the totals in it, so clearing the
// filter is one click on the same row rather than a separate control.

export type SurveyCard = {
  /** null on the "All studies" chip. */
  id: string | null;
  title: string;
  leadCount: number;
  worthACall: number;
  isLive: boolean;
};

export function SurveyFilterCards({
  cards,
  selectedId,
  onSelect,
}: {
  cards: SurveyCard[];
  /** null = the "All studies" chip is selected. */
  selectedId: string | null;
  onSelect: (surveyId: string | null) => void;
}) {
  return (
    // Scrolls rather than wraps: an account with nine studies would otherwise
    // push the queue itself below the fold. -mx/px padding so the focus ring
    // on the first and last chip isn't clipped by the scroll container.
    <div
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      role="group"
      aria-label="Filter the queue by study"
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
              "focus-ring flex min-w-44 max-w-64 flex-col gap-0.5 rounded-control border bg-card px-3 py-2 text-left transition-colors",
              selected
                ? // The ink ring is the selected state. It sits inside the box
                  // (`ring-inset`) so selecting a chip never nudges its
                  // neighbours by the ring's width.
                  "border-primary ring-1 ring-inset ring-primary"
                : "border-border hover:bg-secondary"
            )}
          >
            <span className="flex items-center gap-2">
              <StatusDot live={card.isLive} />
              <span className="type-body-sm truncate font-semibold">{card.title}</span>
              <span className="ml-auto shrink-0 font-archivo text-count text-muted-foreground">
                {card.leadCount}
              </span>
            </span>
            <span className="font-archivo text-count tabular-nums text-muted-foreground">
              {card.worthACall} worth a call
            </span>
          </button>
        );
      })}
    </div>
  );
}
