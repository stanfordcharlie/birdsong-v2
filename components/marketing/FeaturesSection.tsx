export function FeaturesSection({
  heading,
  features,
}: {
  heading: string;
  features: { title: string; body: string }[];
}) {
  return (
    <section id="features" className="mx-auto max-w-[1120px] px-8 pb-[60px] pt-[110px]">
      <h2 className="mb-14 max-w-[620px] font-newsreader text-[clamp(30px,3.6vw,44px)] font-medium leading-[1.15] tracking-[-0.015em] text-[#211D16]">
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-px border border-[rgba(33,29,22,0.14)] bg-[rgba(33,29,22,0.14)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
        {features.map((feature) => (
          <div key={feature.title} className="bg-[#F5EFE3] px-7 py-8">
            <h3 className="mb-2.5 font-newsreader text-[21px] font-medium text-[#211D16]">
              {feature.title}
            </h3>
            <p className="text-pretty text-[14.5px] leading-[1.65] text-[#5D5748]">
              {feature.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
