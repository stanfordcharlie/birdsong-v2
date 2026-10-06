import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, manrope } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Birdsong",
  description: "AI-moderated research platform for B2B demand gen.",
  // No `icons` block: the mark now ships through Next's file conventions
  // (app/icon.png at 32, app/icon1.png at 16, app/apple-icon.png at 180,
  // app/favicon.ico carrying both small sizes). Next emits every <link> and
  // fingerprints each URL, so the cache-busting ?v= these used to need is
  // gone with them.
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
