import {
  Archivo,
  Bricolage_Grotesque,
  Caveat,
  DM_Sans,
  Instrument_Sans,
  Instrument_Serif,
  Inter,
  Newsreader,
  Plus_Jakarta_Sans,
  Source_Serif_4,
  Spectral,
  Young_Serif,
} from "next/font/google";
import localFont from "next/font/local";

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

// Marketing landing pages' display font (design_handoff_landing_v2)
// — headings, the wordmark, and the step badges, weight 700. Loaded as a
// variable font (no fixed weight array) since Bricolage Grotesque ships
// wght 200-800 on Google Fonts and the handoff's own token range (500-800)
// doesn't reduce to one static cut.
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

// Marketing landing pages' body/UI face (design_handoff_landing_v2, which
// replaced Inter here). Scoped to LandingPageShell rather than swapped into
// tailwind's global `sans`: Inter is still the default everywhere outside
// marketing, and the admin/survey surfaces set Archivo explicitly.
export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Home landing page redesign (design_handoff_birdsong_landing) — the display
// face for every heading, button, eyebrow and label on `/`. Loaded as a
// variable font rather than a weight array: the design uses 400 through 800
// and Plus Jakarta Sans ships wght 200-800 as one file on Google Fonts, so
// the static cuts would be five downloads instead of one. Scoped to
// HomeShell; DM Sans (above) stays the body face there.
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

// The four thin-line icons on the home landing page (mic, graphic_eq, groups,
// edit_note). Self-hosted rather than linked from fonts.googleapis.com, and
// subsetted to those four glyph names via the CSS API's `icon_names`
// parameter — 2KB instead of the ~3.5MB full Material Symbols variable font,
// with no third-party request on the critical path. Already a static wght 300
// instance, which is the weight the design specifies.
//
// display: "block", not "swap". These render as ligatures, so the fallback
// face would briefly paint the literal words "mic" and "edit_note" in the
// icon's 56px slot. A short invisible period is the lesser artefact.
export const materialSymbols = localFont({
  src: "../app/fonts/MaterialSymbolsOutlined-subset.woff2",
  variable: "--font-material-symbols",
  display: "block",
  weight: "300",
});

// Home landing page, v2 direction (design_handoff_birdsong_landing,
// `Birdsong Landing v2.dc.html`). The v2 reference replaced the Plus Jakarta
// Sans + Material Symbols direction above with an editorial serif stack, so
// `/` now loads these four and none of the three that HomeShell's
// predecessor (GreenShell) scopes. Scoped to HomeShell for the same reason
// GreenShell scopes its own: admin, the respondent survey and the other
// marketing pages must not download them.
//
// Instrument Serif carries every headline (H1, section H2s, step H3s, the
// lead-card quotes) and ships one weight, 400. Italic is loaded because the
// "A lead, usually" card's footnote is set in it.
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// The "Birdsong" wordmark in the nav and the footer only — 700, and nothing
// else on the page uses this face.
export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-source-serif",
  display: "swap",
});

// Body and UI face for `/`. The static 400/500/600 cuts rather than the
// variable file: the design uses exactly those three.
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
  display: "swap",
});

// The handwritten accents — the hero's six tilted notes and the final CTA
// card's arrow. Weight 600 only.
export const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-caveat",
  display: "swap",
});
