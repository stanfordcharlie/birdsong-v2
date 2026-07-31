// Three-up figure band between the hero and the sequence section
// (design_handoff_landing_pages_full). Rules sit on the left edge of the
// 2nd and 3rd cells rather than as grid gutters, so they vanish cleanly
// when the row stacks.
export function MetricsBand({
  items,
}: {
  items: [{ figure: string; body: string }, { figure: string; body: string }, { figure: string; body: string }];
}) {
  return (
    <section className="border-y border-landing-hair bg-landing-surface">
      <div
        data-reveal
        className="mx-auto grid max-w-[1480px] grid-cols-3 gap-14 px-6 py-14 md:px-10 lp-stack:grid-cols-1 lp-stack:gap-10"
      >
        {items.map((item, i) => (
          <div
            key={item.figure}
            className={
              i === 0
                ? undefined
                : "border-l border-landing-hair pl-14 lp-stack:border-l-0 lp-stack:pl-0"
            }
          >
            <div className="font-spectral text-[52px] font-normal leading-none tracking-[-0.022em]">
              {item.figure}
            </div>
            <div className="mt-3.5 max-w-[32ch] text-[15.5px] leading-[1.6] text-landing-muted">
              {item.body}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
