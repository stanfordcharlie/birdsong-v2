// Step 2 ("Listen") graphic (design_handoff_landing_pages_full): a static
// mini chat fragment (question/answer) plus two signal chips. No motion in
// the source — the only one of the three "how it works" graphics that's
// purely static.
export function ListenGraphic({
  question,
  answer,
  chip1Label,
  chip2Label,
}: {
  question: string;
  answer: string;
  chip1Label: string;
  chip2Label: string;
}) {
  return (
    <div className="flex h-[190px] flex-col justify-center gap-2.5 px-1">
      <div className="max-w-[82%] self-start rounded-tl-2xl rounded-tr-2xl rounded-bl-[4px] rounded-br-2xl border border-landing-border bg-landing-surface px-3.5 py-2.5 text-[13px] shadow-[0_2px_8px_rgba(38,32,25,.05)]">
        {question}
      </div>
      <div className="max-w-[82%] self-end rounded-tl-2xl rounded-tr-2xl rounded-br-[4px] rounded-bl-2xl bg-landing-green px-3.5 py-2.5 text-[13px] text-[#f2f6ef]">
        {answer}
      </div>
      <div className="mt-1 flex flex-wrap gap-2">
        <span className="rounded-full bg-landing-green-bg px-3 py-[5px] text-xs font-semibold text-landing-green">
          {chip1Label}
        </span>
        <span className="rounded-full bg-landing-green-bg px-3 py-[5px] text-xs font-semibold text-landing-green">
          {chip2Label}
        </span>
      </div>
    </div>
  );
}
