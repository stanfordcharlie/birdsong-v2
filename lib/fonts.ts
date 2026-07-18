import { Archivo, Inter, Newsreader, Young_Serif } from "next/font/google";

// Marketing pages only (app/landing-page*) — the platform redesign
// (design_handoff_birdsong_platform) covers admin + the respondent survey,
// not marketing. Body default for the whole app (see tailwind.config.ts's
// fontFamily.sans) so marketing pages don't need to opt in explicitly.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display serif for the marketing landing page. Not applied anywhere else.
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
