import Link from "next/link";

export function FooterCta({
  heading,
  subhead,
  extraLink,
}: {
  heading: string;
  subhead: string;
  extraLink?: { label: string; href: string };
}) {
  return (
    <footer id="cta" className="mt-[90px] bg-[#1F3D2C] text-[#F5EFE3]">
      <div className="mx-auto max-w-[880px] px-8 pb-[90px] pt-[110px] text-center">
        <span className="font-newsreader text-[22px] text-[#33684B]">♪</span>
        <h2 className="text-balance mb-5 mt-3 font-newsreader text-[clamp(34px,4.6vw,56px)] font-medium leading-[1.08] tracking-[-0.02em] text-[#F5EFE3]">
          {heading}
        </h2>
        <p className="mb-[34px] text-base text-[rgba(245,239,227,0.65)]">{subhead}</p>
        <Link
          href="/admin/signup"
          className="inline-block rounded-lg bg-[#F5EFE3] px-[30px] py-3.5 text-[15px] font-semibold text-[#211D16] transition-colors hover:bg-[#FFFDF7]"
        >
          Get started
        </Link>
      </div>
      <div className="mx-auto flex max-w-[1120px] justify-between px-8 pb-[34px] text-[13px] text-[rgba(245,239,227,0.45)]">
        <span>© 2026 Birdsong</span>
        <span className="flex gap-[22px]">
          {extraLink && (
            <Link href={extraLink.href} className="text-[rgba(245,239,227,0.45)] hover:text-[#33684B]">
              {extraLink.label}
            </Link>
          )}
          <Link href="#how" className="text-[rgba(245,239,227,0.45)] hover:text-[#33684B]">
            How it works
          </Link>
          <Link href="#features" className="text-[rgba(245,239,227,0.45)] hover:text-[#33684B]">
            Features
          </Link>
        </span>
      </div>
    </footer>
  );
}
