/**
 * Footer: a copyright line, two legal links and LinkedIn, and nothing else.
 * The closing CTA is doing the closing work, so there is no sitemap block.
 *
 * Transparent, with cream text, because v4 moved it inside SkyCta's section —
 * it sits on the deep end of that section's own gradient rather than on a
 * cream band of its own, which is what removed the horizontal seam that used
 * to run under the CTA. It is rendered by SkyCta, not by the page.
 *
 * It does not participate in the CTA's scroll reveal. By the time anyone has
 * scrolled far enough to read it the reveal has long since fired, so animating
 * it would only risk the bottom of the page being briefly blank.
 */
export function SkyFooter() {
  return (
    <footer
      id="foot"
      className="relative bg-transparent px-[24px] pb-[36px] pt-[40px] text-[14px] text-bsl-cream bsl-wide:px-[48px]"
    >
      <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-[24px]">
        <span>© 2026 Birdsong</span>
        <div className="flex items-center gap-[24px]">
          <a href="/privacy" className="text-bsl-cream hover:opacity-70">
            Privacy
          </a>
          <a href="/terms" className="text-bsl-cream hover:opacity-70">
            Terms
          </a>
          <a
            href="https://www.linkedin.com/company/birdsong"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Birdsong on LinkedIn"
            className="flex items-center gap-[8px] text-bsl-cream hover:opacity-70"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"
              />
            </svg>
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}
