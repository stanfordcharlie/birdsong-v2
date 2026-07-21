import { Archivo, Bricolage_Grotesque, Inter, Newsreader, Spectral, Young_Serif } from "next/font/google";

// Marketing pages only (app/page.tsx, app/customer-success) — the platform redesign
// (design_handoff_birdsong_platform) covers admin + the respondent survey,
// not marketing. Body default for the whole app (see tailwind.config.ts's
// fontFamily.sans) so marketing pages don't need to opt in explicitly.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display serif for the respondent survey flow (design_handoff_survey_respondent
// — PerchedBird's notes, InterviewFlow's headings). The marketing landing
// pages moved to Bricolage Grotesque + Spectral italic
// (design_handoff_landing_pages_full) and no longer use this.
export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

// Platform design system (admin + respondent survey) — see
// design_handoff_birdsong_platform. Young Serif for display headings, big
// numbers, and the wordmark only; Archivo for everything else. Wired into
// tailwind.config.ts as font-serif / font-archivo. Applied at each
// section's layout root (app/admin/layout.tsx, app/survey/[slug]/page.tsx)
// rather than the global <body>, so marketing pages are unaffected.
export const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

// Display serif for the respondent survey flow's editorial redesign
// (design_handoff_survey_respondent, normal style only) and, italic only,
// the marketing landing pages' pull quotes (design_handoff_landing_pages_full).
// One shared loader rather than two: next/font only fetches the weight/style
// faces a page actually renders, so adding italic here costs the survey flow
// nothing.
export const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

// Marketing landing pages' display font (design_handoff_landing_pages_full)
// — headings only, weight 700. Loaded as a variable font (no fixed weight
// array) since Bricolage Grotesque ships wght 200-800 on Google Fonts and
// the handoff's own token range (500-800) doesn't reduce to one static cut.
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
