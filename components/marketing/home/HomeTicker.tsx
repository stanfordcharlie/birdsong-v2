// The three claims, in order. The marquee needs the run twice (see the
// ln-ticker keyframes in globals.css), so the list is mapped rather than
// written out — the two copies cannot drift apart.
const PHRASES = [
  "every lead scored 1 to 10",
  "first hot leads in 7 days",
  "verified respondents, never pitched",
];

function Run() {
  return (
    <span className="flex gap-[40px] whitespace-nowrap pr-[40px]">
      {PHRASES.map((phrase) => (
        <span key={phrase} className="flex gap-[40px]">
          <span>{phrase}</span>
          <span aria-hidden="true">✳</span>
        </span>
      ))}
    </span>
  );
}

/**
 * The pale-green claims band under the hero: a CSS-only infinite marquee.
 *
 * The second run is hidden from assistive tech rather than left to be read
 * twice — it exists only so the 50% translate has something to scroll into.
 */
export function HomeTicker() {
  return (
    <div className="overflow-hidden border-y-2 border-ln-ink bg-ln-green-pale py-[12px]">
      <div className="ln-ticker-track flex w-max font-jakarta text-[17px] font-semibold tracking-[0.02em]">
        <Run />
        <span aria-hidden="true" className="flex">
          <Run />
        </span>
      </div>
    </div>
  );
}
