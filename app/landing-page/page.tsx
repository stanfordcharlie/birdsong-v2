import { permanentRedirect } from "next/navigation";

// The landing page now renders directly at / (see app/page.tsx) — this
// route only exists so previously shared links, bookmarks, and old
// tab-completion habits still resolve, via a permanent (308) redirect.
export default function LandingPageRedirect() {
  permanentRedirect("/");
}
