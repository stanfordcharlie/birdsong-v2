/**
 * Footer: a copyright line and two legal links, and nothing else. The final
 * CTA is doing the closing work, so there is no sitemap block under it.
 */
export function SkyFooter() {
  return (
    <footer className="bg-bsl-cream px-[24px] py-[32px] text-[14px] text-bsl-muted bsl-wide:px-[48px]">
      <div className="mx-auto flex max-w-[1480px] flex-wrap justify-between gap-[24px]">
        <span>© 2026 Birdsong</span>
        <div className="flex gap-[24px]">
          <a href="/privacy" className="text-bsl-muted hover:text-bsl-ink">
            Privacy
          </a>
          <a href="/terms" className="text-bsl-muted hover:text-bsl-ink">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
