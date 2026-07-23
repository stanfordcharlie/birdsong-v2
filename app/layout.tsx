import type { Metadata, Viewport } from "next";
import "./globals.css";
import { inter, youngSerif, archivo } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Birdsong",
  description: "AI-moderated survey platform for B2B demand gen.",
  icons: {
    // Starburst-bird mark (design_handoff_favicon). The PNG tab icons live in
    // public/ and are wired explicitly here. The .ico is not listed: Next
    // auto-emits its own <link> for app/favicon.ico (and serves /favicon.ico
    // for bare browser requests) regardless of this config, so listing it too
    // would just duplicate that link.
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
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
    <html lang="en" className={cn(inter.variable, youngSerif.variable, archivo.variable)}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
