import { PillLink } from "../green/PillLink";

/**
 * Closing CTA band: forest green, with cut-off geometric decor bleeding off
 * three edges.
 *
 * Every decorative shape is aria-hidden and sits behind a `relative`
 * content column, so the copy always wins the stacking order no matter how
 * far the shapes creep in at narrow widths.
 */
export function HomeCta() {
  return (
    <section className="relative overflow-hidden bg-ln-green px-[20px] py-[80px] text-white sm:px-[32px] sm:py-[110px]">
      <div aria-hidden="true">
        <div className="absolute -left-[60px] -top-[80px] size-[260px] rounded-full border-[70px] border-ln-sage opacity-90" />
        <div className="absolute -bottom-[40px] -right-[40px] h-[130px] w-[260px] rounded-t-[130px] bg-ln-green-pale" />
        <div className="absolute -top-[30px] right-[220px] grid grid-cols-[70px_70px] gap-[3px]">
          <div className="size-[70px] rounded-tr-[70px] bg-ln-sage" />
          <div className="size-[70px] rounded-bl-[70px] bg-ln-sage" />
        </div>
      </div>

      <div className="relative mx-auto max-w-[880px] text-center">
        <div aria-hidden="true" className="font-jakarta text-[30px] font-bold tracking-[0.3em] opacity-90">
          ♪♫♪
        </div>
        <h2 className="m-0 mb-[20px] mt-[18px] text-balance font-jakarta text-[clamp(36px,4.6vw,64px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
          Hear what your market is actually saying.
        </h2>
        <p className="mx-auto mb-[40px] mt-0 max-w-[600px] text-[22px] leading-[1.45] opacity-95">
          Tell us who you want to reach. We will have interviews running this week.
        </p>
        <PillLink
          href="/admin/signup"
          variant="cream"
          className="px-[44px] py-[18px] text-[20px] font-bold"
        >
          Get started
        </PillLink>
      </div>
    </section>
  );
}
