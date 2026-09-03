"use client";

import { useEffect, useState } from "react";
import type { ReportSection } from "@/lib/reports/chart-data";

/**
 * The contents rail: a ruled list with the section currently in view
 * marked. The mark is driven by an IntersectionObserver over the section
 * headings; with JavaScript off the list still renders and links, it just
 * does not track.
 */
export function ReportContents({
  sections,
  footer,
}: {
  sections: ReportSection[];
  footer?: React.ReactNode;
}) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // The topmost intersecting section wins, so scrolling up past a
        // boundary hands the mark back to the section above.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: 0 }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Report contents" className="sticky top-28">
      <div className="mb-4 font-mono text-[12.5px] font-medium uppercase tracking-[0.2em] text-landing-muted">
        Contents
      </div>
      <ol className="m-0 flex list-none flex-col border-l border-landing-border p-0">
        {sections.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id} className="-ml-px">
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`block border-l-2 py-[7px] pl-5 text-[16.5px] leading-[1.4] no-underline transition-colors ${
                  isActive
                    ? "border-landing-green font-semibold text-landing-green-deep"
                    : "border-transparent text-landing-muted hover:text-landing-ink"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ol>
      {footer && (
        <div className="mt-8 border-t border-landing-hair pt-6 text-[15px] leading-[1.6] text-landing-muted">
          {footer}
        </div>
      )}
    </nav>
  );
}
