import Image from "next/image";
import Link from "next/link";
import { PillLink } from "@/components/marketing/green/PillLink";

/**
 * Sticky nav for the report template.
 *
 * Same white-on-hairline shell as the landing nav, but the link set is a
 * reader's, not a prospect's: the wordmark goes home, a rule separates the
 * "RESEARCH" label that goes to the library, and the only two things on the
 * right are the methodology anchor and the one call to action.
 */
export function ReportNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-ln-rule bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-[14px] px-[16px] py-[14px] sm:gap-[20px] sm:px-[32px] sm:py-[18px]">
        <Link href="/" className="flex items-center gap-[8px] text-ln-ink no-underline sm:gap-[12px]">
          <Image
            src="/birdsong-logo.png"
            alt=""
            width={46}
            height={46}
            priority
            className="block size-[36px] rounded-[9px] sm:size-[46px] sm:rounded-xl"
          />
          <span className="font-jakarta text-[19px] font-bold tracking-[-0.01em] sm:text-[24px]">
            Birdsong
          </span>
        </Link>
        <span aria-hidden="true" className="hidden h-[28px] w-px bg-ln-card-border sm:block" />
        {/* Hidden on phones along with the rule: the row only fits the
            wordmark and one button at 390px, and the footer carries "All
            reports" at every width. */}
        <Link
          href="/reports"
          className="hidden font-jakarta text-[13px] font-semibold uppercase tracking-[0.2em] text-ln-green no-underline hover:text-ln-green-hover sm:block"
        >
          Research
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-[10px] sm:gap-[24px]">
          {/* Hidden on phones: the contents rail is gone at that width too,
              so the methodology section is reached by scrolling, and the row
              only has space for the logo and one button. */}
          <Link
            href="#methodology"
            className="hidden text-[17px] font-medium text-ln-ink no-underline transition-colors hover:text-ln-green sm:block"
          >
            Methodology
          </Link>
          <PillLink
            href="/admin/signup"
            variant="filled"
            className="px-[16px] py-[10px] text-[15px] sm:px-[30px] sm:py-[14px] sm:text-[17px]"
          >
            Run this study
          </PillLink>
        </div>
      </div>
    </nav>
  );
}
