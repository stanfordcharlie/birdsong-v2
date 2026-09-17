/** Green CTA banner: cream rules-grid, two decorative outline circles. */
export function CtaBanner({ bookDemoUrl }: { bookDemoUrl: string }) {
  return (
    <section className="mx-auto max-w-[1200px] px-[24px] pb-[120px]">
      <div className="hp-grid-cream relative flex flex-col items-center gap-[22px] overflow-hidden rounded-[8px] bg-hp-green px-[32px] py-[110px] text-center">
        <div className="absolute -left-[40px] -top-[40px] h-[180px] w-[180px] rounded-full border-2 border-hp-cream/70" />
        <div className="absolute -bottom-[80px] -right-[60px] h-[240px] w-[240px] rounded-full border-2 border-hp-cream/70" />
        <h2 className="relative m-0 max-w-[760px] text-balance font-hp-serif text-[clamp(40px,5.6vw,80px)] font-normal leading-none tracking-[-0.02em] text-hp-cream">
          Pipeline that shows up qualified
        </h2>
        <p className="relative m-0 text-[clamp(18px,1.7vw,24px)] text-hp-cream opacity-[0.92]">
          Join the revenue teams already running interview-led pipeline with Birdsong
        </p>
        <a
          href={bookDemoUrl}
          className="relative mt-[10px] inline-flex items-center gap-[6px] rounded-[4px] bg-hp-cream px-[22px] py-[13px] text-[17px] text-hp-ink transition-colors hover:bg-white"
        >
          Book a demo <span>→</span>
        </a>
      </div>
    </section>
  );
}
