import { permanentRedirect } from "next/navigation";

// Moved to /customer-success (see app/customer-success/page.tsx) — this
// route only exists so previously shared links and bookmarks still
// resolve, via a permanent (308) redirect.
export default function LandingPage2Redirect() {
  permanentRedirect("/customer-success");
}
