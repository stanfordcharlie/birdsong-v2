import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type FooterColumn = { heading: string; links: { label: string; href: string }[] };

// The right-hand column is identical on both pages, so it lives here rather
// than being passed in twice.
const COMPANY: FooterColumn = {
  heading: "Company",
  links: [
    { label: "Log in", href: "/admin/login" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

/**
 * Shared footer for the landing page and the report template. Only the
 * tagline and the middle column differ between them — the landing leads with
 * PRODUCT, the report with RESEARCH.
 */
export function GreenFooter({
  tagline,
  column,
  bordered = false,
}: {
  tagline: string;
  column: FooterColumn;
  /** The report page sits on cream, so its footer needs a top rule to read as a footer. */
  bordered?: boolean;
}) {
  const columns = [column, COMPANY];
  return (
    <footer className={cn("bg-white px-[20px] pb-[40px] pt-[56px] sm:px-[32px]", bordered && "border-t border-ln-rule")}>
      <div className="mx-auto grid max-w-[1240px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[40px]">
        <div>
          <div className="flex items-center gap-[10px]">
            <Image
              src="/birdsong-logo.png"
              alt=""
              width={36}
              height={36}
              className="block size-[36px] rounded-[10px]"
            />
            <span className="font-jakarta text-[20px] font-bold">Birdsong</span>
          </div>
          <p className="m-0 mt-[16px] max-w-[320px] text-[16px] leading-[1.5] text-ln-muted">
            {tagline}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.heading} className="grid gap-[10px] text-[16px]">
            <div className="mb-[6px] font-jakarta text-[13px] font-semibold uppercase tracking-[0.18em] text-ln-faint">
              {column.heading}
            </div>
            {column.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-ln-ink no-underline transition-colors hover:text-ln-green"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-[40px] max-w-[1240px] border-t border-ln-rule pt-[24px] text-[14px] text-ln-faint">
        © {new Date().getFullYear()} Birdsong
      </div>
    </footer>
  );
}
