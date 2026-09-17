import { MaterialIcon, type GreenIconName } from "../green/MaterialIcon";
import { SectionHeading } from "./SectionHeading";

const PROPS: { icon: GreenIconName; title: string; body: string }[] = [
  {
    icon: "mic",
    title: "Real conversations, not forms.",
    body: "An in-depth conversation about how their team actually works. Nothing is pitched and your product is never named.",
  },
  {
    icon: "groups",
    title: "We recruit the audience.",
    body: "Respondents are recruited against your brief and verified on role and company. Birdsong handles the incentive.",
  },
  {
    icon: "edit_note",
    title: "You own the brief.",
    body: "Define the audience and the ICP. Every score ships with the quotes it came from, so your team can disagree with it.",
  },
];

/** The three "why this is different" cards, directly under the ticker. */
export function ValueProps() {
  return (
    <section className="bg-white px-[20px] py-[64px] sm:px-[32px] sm:py-[96px]">
      <div className="mx-auto max-w-[1240px]">
        <SectionHeading
          heading="Deeper than a form fill. Faster than a research firm."
          sub="Real conversations with the people you want to reach, qualified against your ICP and handed to your reps with the reasoning attached."
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[24px]">
          {PROPS.map((prop) => (
            <div
              key={prop.title}
              className="min-w-0 border-[1.5px] border-ln-card-border px-[32px] pb-[48px] pt-[44px] sm:px-[40px]"
            >
              <MaterialIcon name={prop.icon} className="mb-[34px] block text-[56px]" />
              <h3 className="m-0 mb-[14px] font-jakarta text-[26px] font-bold tracking-[-0.01em]">
                {prop.title}
              </h3>
              <p className="m-0 text-[19px] leading-[1.45] text-ln-body">{prop.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
