import { cn } from "@/lib/utils";

/**
 * The centred eyebrow / H2 / sub stack that opens the value props, how it
 * works and lead comparison sections.
 *
 * `subClassName` exists for the one thing that genuinely varies between
 * them: how wide the sub is allowed to run (760px under a two-line heading,
 * 720px under a three-line one) so the ragged edge sits where the design
 * puts it.
 */
export function SectionHeading({
  eyebrow,
  heading,
  sub,
  subClassName,
}: {
  eyebrow?: string;
  heading: string;
  sub: string;
  subClassName?: string;
}) {
  return (
    <>
      {eyebrow && (
        <p className="m-0 text-center font-jakarta text-[15px] font-semibold uppercase tracking-[0.2em] text-ln-green">
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "m-0 mb-[18px] text-balance text-center font-jakarta text-[clamp(34px,4.2vw,58px)] font-extrabold leading-[1.08] tracking-[-0.025em]",
          eyebrow && "mt-[14px]"
        )}
      >
        {heading}
      </h2>
      <p
        className={cn(
          "mx-auto mb-[56px] mt-0 text-pretty text-center text-[21px] leading-[1.45] text-ln-body",
          subClassName ?? "max-w-[760px]"
        )}
      >
        {sub}
      </p>
    </>
  );
}
