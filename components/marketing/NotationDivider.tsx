// Full-width 5-line music staff divider between the hero and "How it
// works" (design_handoff_landing_pages_full) — identical on both pages,
// purely decorative, no motion.
export function NotationDivider() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-[1360px] px-6 md:px-12">
      <svg
        width="100%"
        height="30"
        viewBox="0 0 1200 30"
        preserveAspectRatio="none"
        fill="none"
        className="block opacity-55"
      >
        <path d="M0 5h1200M0 10h1200M0 15h1200M0 20h1200M0 25h1200" stroke="var(--lp-border)" strokeWidth="1" />
        <text x="90" y="21" fontSize="15" fill="var(--lp-blue)" opacity=".8">
          &#9834;
        </text>
        <text x="1105" y="14" fontSize="13" fill="var(--lp-green)" opacity=".8">
          &#9835;
        </text>
      </svg>
    </div>
  );
}
