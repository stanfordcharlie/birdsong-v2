/**
 * Find / Talk / Route — the three-column recap under the demo.
 *
 * A single hairline across the top and nothing between the columns: the grid
 * gap and the 32px right padding on each cell do the separating. Each cell
 * pads only on its right and top, so the first column's text stays flush with
 * the section's left edge and the rule above it starts at the same x.
 *
 * `auto-fit, minmax(260px, 1fr)` rather than a breakpoint — three columns on
 * a desktop, two on a tablet, one on a phone, with no cutoff to keep in sync
 * with the rest of the page.
 */

const STEPS = [
  {
    label: "Find",
    title: "The right people",
    body: "Launch a research study on a topic your market cares about. Birdsong recruits participants who match your ICP.",
  },
  {
    label: "Talk",
    title: "Real interviews",
    body: "An AI moderator runs each interview, asks follow-ups, and learns their needs, timing, and budget.",
  },
  {
    label: "Route",
    title: "Straight to sales",
    body: "Qualified opportunities land in your CRM with a summary your reps can act on.",
  },
];

export function StepsSection() {
  return (
    <section className="bg-bsl-cream px-[24px] pb-[120px] pt-[40px] bsl-wide:px-[48px]">
      <div className="mx-auto grid max-w-[1480px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] border-t border-bsl-line-soft">
        {STEPS.map((s) => (
          <div key={s.label} className="flex flex-col gap-[14px] pr-[32px] pt-[40px]">
            <div className="text-[13px] font-semibold uppercase tracking-[0.1em] text-bsl-forest">
              {s.label}
            </div>
            <div className="font-bsl-serif text-[40px] leading-[1.05] text-bsl-ink">{s.title}</div>
            <div className="max-w-[380px] text-[18px] leading-[1.5] text-bsl-body-soft">
              {s.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
