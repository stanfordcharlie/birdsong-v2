import Image from "next/image";
import { hpPrimary, hpSecondary } from "./buttons";

/** Nav: wordmark, two section links, log in + book a demo. Not sticky. */
export function HomeNav({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <div className="mx-auto flex max-w-[1200px] items-center gap-[36px] px-[24px] py-[26px]">
      <a href="#top" className="flex items-center gap-[10px]">
        <Image
          src="/birdsong-logo.png"
          alt="Birdsong"
          width={30}
          height={30}
          priority
          className="block rounded-[7px]"
        />
        <span className="font-hp-wordmark text-[26px] font-bold leading-none tracking-[-0.015em]">
          Birdsong
        </span>
      </a>
      <nav className="flex flex-1 flex-wrap gap-[26px] text-[17px] font-normal text-hp-body">
        <a href="#product" className="transition-colors hover:text-hp-green">
          Product
        </a>
        <a href="#pricing" className="transition-colors hover:text-hp-green">
          Pricing
        </a>
      </nav>
      <div className="flex items-center gap-[12px]">
        <a href="/admin/login" className={`${hpSecondary} px-[18px] py-[11px] text-[16px]`}>
          Log in
        </a>
        <a href={bookDemoUrl} className={`${hpPrimary} px-[18px] py-[11px] text-[16px]`}>
          Book a demo <span>→</span>
        </a>
      </div>
    </div>
  );
}
