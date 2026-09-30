import { permanentRedirect } from "next/navigation";

// The sky direction now renders directly at / (see app/page.tsx) — this
// route only exists so the preview links shared while it was being built
// still resolve, via a permanent (308) redirect. Same arrangement as
// /landing-page and /landing-page-2.
export default function LandingV3Redirect() {
  permanentRedirect("/");
}
