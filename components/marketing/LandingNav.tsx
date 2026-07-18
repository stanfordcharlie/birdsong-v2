import Link from "next/link";
import { BirdLogo } from "./BirdLogo";

export function LandingNav({
  crossLink,
}: {
  crossLink?: { label: string; href: string };
}) {
  return (
    <nav className="mx-auto flex max-w-[1120px] items-center justify-between px-8 py-[26px]">
      <Link href="#top" className="flex items-center gap-2.5">
        <BirdLogo size={26} />
        <span className="font-newsreader text-[21px] font-medium tracking-[-0.01em] text-[#211D16]">
          Birdsong
        </span>
      </Link>
      <div className="flex items-center gap-7 text-sm text-[#5D5748]">
        {crossLink && (
          <Link href={crossLink.href} className="transition-colors hover:text-[#33684B]">
            {crossLink.label}
          </Link>
        )}
        <Link href="#how" className="transition-colors hover:text-[#33684B]">
          How it works
        </Link>
        <Link href="#features" className="transition-colors hover:text-[#33684B]">
          Features
        </Link>
        <Link
          href="/admin/signup"
          className="rounded-lg bg-[#211D16] px-[18px] py-[9px] font-medium text-[#F5EFE3] transition-colors hover:bg-[#3A342A]"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
