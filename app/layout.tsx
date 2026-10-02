import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, manrope } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Birdsong",
  description: "AI-moderated research platform for B2B demand gen.",
  icons: {
    // Sky-blue tile with the cream bird mark (birdsong-skyblue-icon-2026-10).
    // The PNG tab icons live in public/ and are wired explicitly here. The
    // .ico is not listed: Next auto-emits its own <link> for app/favicon.ico
    // (and serves /favicon.ico for bare browser requests) regardless of this
    // config, so listing it too would just duplicate that link.
    //
    // ?v=2 on every URL: the filenames are unchanged from the green tile
    // these replaced, and a favicon is one of the most aggressively cached
    // things a browser holds, so without the query a returning visitor keeps
    // the old mark in the tab. The .ico cannot carry one (Next owns that
    // link), but it is the fallback, not what a modern browser picks.
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon-32.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png?v=2", type: "image/png", sizes: "16x16" },
    ],
    apple: { url: "/apple-touch-icon.png?v=2", sizes: "180x180" },
  },
};

// Brand green for browser chrome (mobile address bar, PWA splash/install UI)
// that would otherwise default to white; the manifest pairs it with the
// eggshell background the favicon tile uses.
//
// width/initialScale restate Next's own defaults; viewportFit: "cover" is
// the part that matters — without it iOS letterboxes the page inside the
// safe area and every env(safe-area-inset-*) resolves to 0px, so the
// respondent survey's home-indicator clearance would silently do nothing.
// userScalable is deliberately left alone: pinch-zoom stays available.
export const viewport: Viewport = {
  themeColor: "#3a6046",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: on /landing-old, HeroIntroGate stamps data-intro on
    // <html> before React hydrates it (see components/marketing/home/v2/
    // heroIntro.ts). Without this, dev builds log "Extra attributes from the
    // server" on every first visit. Scoped to this one element's attributes.
    <html
      lang="en"
      className={cn(inter.variable, manrope.variable)}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
