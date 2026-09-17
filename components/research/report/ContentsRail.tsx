"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReportSection } from "@/lib/reports/chart-data";
import { PillLink } from "@/components/marketing/green/PillLink";

/**
 * The sticky contents rail beside the report body.
 *
 * The active item tracks the reader rather than the click: an
 * IntersectionObserver with a `-20% 0px -60%` root margin treats the band
 * just below the nav as "where you are", so a section becomes active as its
 * heading settles under the header instead of the moment its last pixel
 * enters the viewport.
 *
 * Hidden below 960px by CSS, not by script — at that width the body is one
 * column and the rail would be a second copy of the headings the reader is
 * about to scroll past. Rendering it hidden rather than not at all keeps the
 * markup identical between server and client.
 */
export function ContentsRail({
  sections,
  footer,
}: {
  sections: ReportSection[];
  footer: React.ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Take the topmost section currently inside the band, so scrolling
        // up lands on the section you are entering rather than the one you
        // just left.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <aside className="sticky top-[104px] hidden min-w-0 max-w-[300px] ln-rail:block">
      <div className="mb-[18px] font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-green">
        Contents
      </div>
      <nav className="grid border-l-2 border-ln-card-border">
        {sections.map((section) => {
          const on = section.id === active;
          return (
            <Link
              key={section.id}
              href={`#${section.id}`}
              aria-current={on ? "true" : undefined}
              className={`-ml-0.5 block border-l-2 py-[10px] pl-[18px] text-[16px] leading-[1.3] no-underline transition-colors ${
                on
                  ? "border-ln-green font-semibold text-ln-green"
                  : "border-transparent text-ln-body hover:text-ln-green"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-[28px] border-t-[1.5px] border-ln-card-border pt-[20px] text-[14px] leading-[1.6] text-ln-muted">
        {footer}
      </div>
      <PillLink
        href="/admin/signup"
        variant="outline"
        className="mt-[22px] px-[24px] py-[12px] text-[15px]"
      >
        Run this study
      </PillLink>
    </aside>
  );
}
