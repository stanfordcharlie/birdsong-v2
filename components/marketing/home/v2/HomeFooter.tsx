import Image from "next/image";
import { hpPrimary } from "./buttons";

/** Footer: oversized wordmark, three link columns, bottom rule. */
export function HomeFooter({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <footer className="mx-auto flex max-w-[1200px] flex-col gap-[40px] px-[24px] pb-[40px] hp-wide:gap-[56px]">
      <a href="#top" className="flex items-center gap-[16px]">
        <Image
          src="/birdsong-logo.png"
          alt="Birdsong"
          width={64}
          height={64}
          className="block rounded-[14px]"
        />
        <span className="font-hp-wordmark text-[clamp(44px,4.6vw,66px)] font-bold leading-none tracking-[-0.02em]">
          Birdsong
        </span>
      </a>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] items-start gap-[32px] hp-wide:gap-[40px]">
        <div className="col-span-1 flex flex-col gap-[20px] hp-wide:col-span-2">
          <p className="m-0 max-w-[360px] text-[clamp(19px,1.7vw,24px)] leading-[1.35] text-hp-body">
            Interview-Led Pipeline Built For B2B Revenue Teams.
          </p>
          <a href={bookDemoUrl} className={`${hpPrimary} self-start px-[18px] py-[11px] text-[16px]`}>
            Book a demo <span>→</span>
          </a>
        </div>
        <div className="flex flex-col gap-[14px] text-[20px] text-hp-body">
          <a href="#product" className="transition-colors hover:text-hp-green">
            Product
          </a>
        </div>
        <div className="flex flex-col gap-[14px] text-[20px] text-hp-body">
          <a href="mailto:hello@usebirdsong.com" className="transition-colors hover:text-hp-green">
            Contact
          </a>
          <a href="#top" className="transition-colors hover:text-hp-green">
            Careers
          </a>
          <a
            href="https://www.linkedin.com/company/usebirdsong"
            target="_blank"
            rel="noopener"
            aria-label="Birdsong on LinkedIn"
            className="inline-flex items-center gap-[10px] transition-colors hover:text-hp-green"
          >
            <span className="inline-flex h-[28px] w-[28px] items-center justify-center rounded-[5px] bg-hp-ink font-hp-sans text-[15px] font-semibold leading-none tracking-[-0.02em] text-hp-cream">
              in
            </span>
            <span>LinkedIn</span>
          </a>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-[16px] border-t border-hp-line pt-[24px] text-[15px] text-hp-faint">
        <span>© 2026 Birdsong. All rights reserved.</span>
        <span>hello@usebirdsong.com</span>
      </div>
    </footer>
  );
}
